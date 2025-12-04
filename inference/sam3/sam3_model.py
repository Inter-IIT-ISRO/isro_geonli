from transformers  import Sam3Processor, Sam3Model
import torch
from PIL import Image
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from classify import classify_query
from utils import mask_to_rotated_box, calculate_area, calculate_perimeter, overlay_masks, plot_rotated_boxes_from_path
from tqdm import tqdm
import cv2
from shapely.geometry import Polygon
import torch
import numpy as np


class SAM_MODEL():
  def __init__(self , device, idx2label):
    self.sam_model = Sam3Model.from_pretrained("sam_model")
    self.sam_processor = Sam3Processor.from_pretrained("sam_model")
    self.sam_model.to(device).eval()
    self.bert_model_dir = "bert_model_subtype"
    self.bert_model = AutoModelForSequenceClassification.from_pretrained(self.bert_model_dir)
    self.bert_model.to(device).eval()
    self.idx2label = idx2label
    self.device = device

  def get_output(self , image, text, threshold=0.1, mask_threshold=0.5):
      inputs = self.sam_processor(images=image, text=text.strip(), return_tensors='pt').to(self.device)

      for key in inputs:
          if inputs[key].dtype == torch.float32:
              inputs[key] = inputs[key].to(self.sam_model.dtype)

      with torch.no_grad():
          outputs = self.sam_model(**inputs)

      results = self.sam_processor.post_process_instance_segmentation(
          outputs,
          threshold=threshold,
          mask_threshold=mask_threshold,
          target_sizes=inputs.get("original_sizes").tolist()
      )[0]

      output_seg = self.sam_processor.post_process_semantic_segmentation(outputs, threshold = 0.5 , target_sizes= inputs.get("original_sizes").tolist())[0]

      return results, output_seg


  def nms_8point_opencv(self,boxes_8point, scores, score_threshold, nms_threshold=0.5):
      rotated_rects = []
      
      for box in boxes_8point:
          pts = np.array(box, dtype=np.float32).reshape(4, 2)
          
          rect = cv2.minAreaRect(pts)
          rotated_rects.append(rect)

      keep_indices = cv2.dnn.NMSBoxesRotated(
          bboxes=rotated_rects,
          scores=scores,
          score_threshold=score_threshold,
          nms_threshold=nms_threshold
      )

      if len(keep_indices) > 0:
          return keep_indices.flatten()
      return []


  def semantic_mask_to_obb(self , mask):
      mask = (mask > 0).astype(np.uint8) * 255

      contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
      if len(contours) == 0:
          return None

      boxes = []

      for cnt in contours:
          rect = cv2.minAreaRect(cnt)

          box = cv2.boxPoints(rect)  
          box = np.int32(box).flatten()     
          boxes.append(box.flatten())

      return boxes


  def mask_to_obb_all_coords(self, mask):
      mask = (mask > 0).astype(np.uint8) * 255

      contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
      if len(contours) == 0:
          return None

      cnt = max(contours, key=cv2.contourArea)

      rect = cv2.minAreaRect(cnt)

      box = cv2.boxPoints(rect)  
      box = np.int32(box)        

      return box.flatten()

  def calculate_iob1(self, box1, box2):
      poly1 = Polygon(box1)
      poly2 = Polygon(box2)

      if not poly1.is_valid or not poly2.is_valid:
          return 0

      intersection_area = poly1.intersection(poly2).area
      union_area = poly1.area

      iou = intersection_area / union_area if union_area > 0 else 0
      return iou



  def get_final_boxes(self,image, text):
      results, semantic_seg = self.get_output(image, text)
      instance_masks = results['masks'].cpu().numpy()
      scores = results['scores'].float().cpu().numpy()

      instance_boxes = []
      f_scores = []


      for i, mask in enumerate(instance_masks):
          box = self.mask_to_obb_all_coords(mask)
          if box is not None:
              instance_boxes.append(box)
              f_scores.append(scores[i])

      keep_boxes = self.nms_8point_opencv(instance_boxes, f_scores, 0.)
      instance_boxes = [instance_boxes[i] for i in keep_boxes]

      semantic_boxes = self.semantic_mask_to_obb(semantic_seg.float().cpu().numpy())

      final_boxes = []

      THRESHOLD = 0.5

      for i_box in instance_boxes:
          iob1_scores = []
          for s_box in semantic_boxes:
              iob1_scores.append(self.calculate_iob1(i_box.reshape(4, 2), s_box.reshape(4, 2)))
          iob1_scores = np.array(iob1_scores)


          if (iob1_scores>THRESHOLD).any():
              final_boxes.append(i_box.tolist())


      return final_boxes




  def infer(self , image_path ,user_query, transformed_query, task, resolution=None):
    image = Image.open(image_path)

    if(task == 'vqa_numeric'):
      sub_class = classify_query(user_query, self.bert_model, self.idx2label)
      if(sub_class == 'area'):
        _ , mask = self.get_output(image , transformed_query)
        total_area = calculate_area(mask.cpu().numpy(), resolution)
        return total_area

      elif(sub_class == 'length'):
        _ , mask = self.get_output(image , transformed_query)
        total_perimeter = calculate_area(mask.cpu().numpy(), resolution)
        return total_perimeter

      else:
        boxes = self.get_final_boxes(image , transformed_query)
        return len(boxes)

    elif(task == 'grounding'):
      boxes = self.get_final_boxes(image , transformed_query)
      return boxes

if __name__ == "__main__":
    idx2label = {1: 'area', 2: 'length', 0: 'count'}
    device = "cuda" if torch.cuda.is_available() else "cpu"
    sam3_model = SAM_MODEL(device, idx2label)
    
    user_query = "area of "
    transformed_query = "airplanes"
    # user_query = "blue region in the larger swimming pool"

    bbox = sam3_model.infer('sample1.png', user_query, transformed_query, 'vqa_numeric')
    print(bbox)
    # plot_rotated_boxes_from_path('sample2.png', bbox, 'output2.png')

