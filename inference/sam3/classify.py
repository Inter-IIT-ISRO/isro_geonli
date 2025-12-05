from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

bert_model_subtype_dir = "bert_model_subtype"
bert_tokenizer = AutoTokenizer.from_pretrained(bert_model_subtype_dir, use_fast=True)
device = "cuda" if torch.cuda.is_available() else "cpu"

def classify_query(text , model , idx2label):
  inputs = bert_tokenizer(
      text,
      return_tensors="pt",
      truncation=True,
      padding=True
  ).to(device)

  with torch.no_grad():
      outputs = model(**inputs)
      logits = outputs.logits 

  pred_idx = torch.argmax(logits, dim=-1).item()
  pred_label = idx2label.get(pred_idx, "UNKNOWN")

  return pred_label

if __name__ == '__main__':
    bert_model_global = AutoModelForSequenceClassification.from_pretrained(bert_model_global_dir)
    bert_model_global.to(device)
    bert_model_global.eval()

    bert_model_subtype = AutoModelForSequenceClassification.from_pretrained(bert_model_subtype_dir)
    bert_model_subtype.to(device)
    bert_model_subtype.eval()

    # user_query = "Generate a detailed caption describing all visible elements in the satellite image, including object types, counts, relative locations, and overall scene context."
    # print(classify_query(user_query , bert_model , sub1_idx2label))

    # user_query = "Locate and return oriented bounding boxes for the ground track field seen in the image."
    # print(classify_query(user_query , bert_model , sub1_idx2label))

    # user_query = "Is there any digit present in the bottom right corner of the scene?"
    # print(classify_query(user_query , bert_model , sub1_idx2label))

    user_query = "How much is the area of the aeroplane present here"
    print(classify_query(user_query , bert_model_global , idx2label_global))
    print(classify_query(user_query , bert_model_subtype , idx2label_subtype))

    # user_query = "What is the color of the digit painted on the landing strip?"
    # print(classify_query(user_query , bert_model , sub1_idx2label))
