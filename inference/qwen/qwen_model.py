from unsloth import FastVisionModel
from huggingface_hub import login
from peft import PeftModel
from transformers import TextIteratorStreamer
from PIL import Image
from threading import Thread
from typing import Dict, Any
import io

class QwenModel():
  def __init__(self):

    max_seq_length = 16384

    self.model, self.tokenizer = FastVisionModel.from_pretrained(
        model_name = "qwen_lora_model",
        max_seq_length = max_seq_length,
        load_in_4bit = True,
    )
    # FastVisionModel.for_inference(self.model)

  def infer(self, image_path, user_query, task, to_stream=True):
    TASK_CONFIG = {
        'captioning': {
            'length': "The answer must be approximately 50 words (strictly 10-200 words).",
        },
        'vqa_binary': {
            'length': "The answer must be strictly 1 word. (eg., Yes/No)",
        },
        'vqa_semantic': {
            'length': "The answer must be strictly 1 to 5 words, preferably 1.",
        },
        'sidebar_title': {
          'length': "The answer must be strictly less than 5 words"
        },
        'classify': {
            'length': "N/A" 
        }
    }

    if task == 'classify':
        to_stream = False 
        
        text_content = (
            f"Task: Analyze the following text query regarding a remote sensing image strictly.\n"
            f"Query: '{user_query}'\n\n"
            f"Step 1 (Classify): Categorize the query into exactly one of the following classes based on the intent.\n"
            f"CRITICAL PRIORITY RULE: If the query contains verbs like 'Locate', 'Find', 'Detect', 'Segment', or asks for 'coordinates' or 'boxes', it MUST be classified as 'grounding', regardless of the object type.\n\n"
            f"- captioning: Requests for a holistic description, summary, or context of the whole scene.\n"
            f"  (e.g., 'Describe the terrain', 'Generate a caption for this satellite image')\n\n"
            f"- vqa_binary: Questions demanding a strict YES or NO answer.\n"
            f"  (e.g., 'Is there a swimming pool?', 'Are there clouds?')\n\n"
            f"- vqa_semantic: Open-ended questions about attributes (color, shape, material) or scene understanding.\n"
            f"  (e.g., 'What color is the roof?', 'What type of aircraft is this?')\n\n"
            f"- vqa_numeric: Questions about counting, dimensions, area, or density.\n"
            f"  (e.g., 'How many cars?', 'What is the area of the building?', 'Count the trees.')\n\n"
            f"- grounding: Requests to spatially locate specific objects using bounding boxes, coordinates, or masks.\n"
            f"  (e.g., 'Locate the swimming pools', 'Find the red car', 'Return OBB for aircrafts')\n\n"
            f"Step 2 (Transform):\n"
            f"- IF category is 'vqa_numeric' or 'grounding': Extract the *target object phrase* only. Remove command verbs (Locate, Find, Count), question words (How many, What is), and generic filler words (the, an, visible, present, seen in the image). Preserve adjectives that distinguish the object (e.g., 'larger', 'blue').\n"
            f"- IF category is anything else: Return the original query.\n\n"
            f"Examples:\n"
            f"1. Query: 'How many airplanes are present in the scene?' -> Output: vqa_numeric ||| airplanes\n"
            f"2. Query: 'Locate the swimming pools in the image' -> Output: grounding ||| swimming pools\n"
            f"3. Query: 'Is there a swimming pool in the image?' -> Output: vqa_binary ||| Is there a swimming pool in the image?\n"
            f"4. Query: 'Locate and return oriented bounding boxes for the ground track field.' -> Output: grounding ||| ground track field\n"
            f"5. Query: 'What is the area of the blue region in the larger swimming pool?' -> Output: vqa_numeric ||| blue region larger swimming pool\n"
            f"6. Query: 'Find the coordinates of the storage tanks.' -> Output: grounding ||| storage tanks\n\n"
            f"OUTPUT FORMAT:\n"
            f"Return the result strictly using the delimiter '|||' as follows:\n"
            f"Category ||| Transformed Query"
        )
    else:
        current_constraint = TASK_CONFIG.get(task, {}).get('length', "Keep it concise.")
        
        text_content = (
          f"In this remote sensing image task, answer the following question: "
          f"'{user_query.rstrip('.')}'. "
        )

        if to_stream:
            REASONING_START = "<REASONING>"
            REASONING_END = "</REASONING>"
            SOLUTION_START = "<SOLUTION>"
            SOLUTION_END = "</SOLUTION>"

            text_content += (
                f"INSTRUCTIONS:\n"
                f"1. You must start your response IMMEDIATELY with {REASONING_START}. Do not write any conversational text before this tag.\n"
                f"2. Inside the reasoning block, outline your step-by-step thought process using bullet points.\n"
                f"3. CRITICAL FORMATTING: Every single bullet point MUST start with a Gerund Phrase (Verb+ing) followed by a colon. You are strictly FORBIDDEN from writing plain bullet points.\n"
                f"   - Correct: '* Analyzing the query intent: The user is asking for...'\n"
                f"   - Incorrect: '* The user is asking for...'\n"
                f"4. Internal Monologue: The text following the colon must read like an internal thought process (analyzing, doubting, verifying), not a final statement.\n"
                f"5. When your analysis is complete, you MUST close the reasoning block with {REASONING_END}.\n"
                f"6. Immediately after closing the reasoning, provide the final answer between {SOLUTION_START} and {SOLUTION_END}.\n"
                f"7. LENGTH CONSTRAINT: {current_constraint}"
            )
        else:
            text_content += (
              f"INSTRUCTIONS:\n"
              f"1. Provide a direct, accurate answer based on the visual data.\n"
              f"2. LENGTH CONSTRAINT: {current_constraint}"
            )

    image = Image.open(image_path)
    
    prompt_struct = [
        {
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": text_content},
            ],
        },
    ]

    prompt_str = self.tokenizer.apply_chat_template(
        prompt_struct,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = self.tokenizer(
        image,
        prompt_str,
        add_special_tokens=False,
        return_tensors="pt",
    ).to("cuda")

    gen_kwargs: Dict[str, Any] = dict(
        **inputs,
        max_new_tokens=512,
        temperature=0.2 if task == 'classify' else 1.0,
        min_p=0.1,
        use_cache=True,
        cache_implementation="standard"
    )

    if to_stream:
        def stream_generator():
            streamer = TextIteratorStreamer(self.tokenizer, skip_prompt=True, skip_special_tokens=True)
            gen_kwargs['streamer'] = streamer
            
            thread = Thread(target=self.model.generate, kwargs=gen_kwargs)
            thread.start()

            for new_text in streamer:
                yield new_text
        
        return stream_generator()

    else:
        output_ids = self.model.generate(**gen_kwargs)
        
        generated_ids = output_ids[0][inputs.input_ids.shape[1]:]
        response = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
        
        return response

if __name__ == "__main__":
    try:
        model = QwenModel()
        
        print("\n--- Testing Classification & Transformation ---")
        queries = [
            # "Can you count the number of storage tanks in the area?",
            # "Locate the nearest airplane to the storage tank",
            # "What is the area of playground whose colour is green",
            # "Locate the biggest airplane nearest to the storage tank"
            "Locate the swimming pools in the image"
        ]
        
        for q in queries:
            response = model.infer("./sample1.png", q, "classify", to_stream=False)
            print(f"Query: {q}")
            print(f"Result: {response}\n")

        # --- TEST 2: Standard Inference ---
        # print("\n--- Testing Standard Inference ---")
        # user_query_2 = "Is there any digit present in the bottom right corner of the scene?"
        # task_2 = "vqa_binary"
        
        # generator = model.infer("./sample1.png", user_query_2, task_2, True)
        # print(f"Query: {user_query_2}")
        # print("Response: ", end="")
        # for token in generator:
        #     print(token, end="", flush=True)
        # print("\n")

    except Exception as e:
        print(f"Error during execution: {e}")
        print("Note: Ensure 'sample1.png' exists and CUDA is available.")
