import json
import os
from pathlib import Path

def convert_txt_to_json():
    """Convert all txt files in data/raw/uploads to JSON format."""
    uploads_dir = Path("data/raw/uploads")
    output_file = "ethiopia_smartcity_dataset.json"
    
    documents = []
    
    for txt_file in uploads_dir.glob("*.txt"):
        content = txt_file.read_text(encoding="utf-8")
        
        title = txt_file.stem
        filename_lower = txt_file.name.lower()
        
        if "birth" in filename_lower:
            category = "Civil Registration"
            service_area = "Birth certificate"
        elif "marriage" in filename_lower:
            category = "Civil Registration"
            service_area = "Marriage certificate"
        elif "business" in filename_lower:
            category = "Business"
            service_area = "Business licence"
        elif "emergency" in filename_lower:
            category = "Emergency"
            service_area = "Emergency contacts"
        elif "hospital" in filename_lower:
            category = "Health"
            service_area = "Hospitals"
        elif "bus" in filename_lower:
            category = "Transport"
            service_area = "Bus routes"
        elif "ethiotelecom" in filename_lower:
            category = "Telecom"
            service_area = "Telecom support"
        elif "electricity" in filename_lower or "digital_payment" in filename_lower:
            category = "Utilities"
            service_area = "Bill payments"
        elif "water" in filename_lower:
            category = "Utilities"
            service_area = "Water bills"
        elif "streetlight" in filename_lower:
            category = "Infrastructure"
            service_area = "Report issues"
        elif "addis" in filename_lower or "civil_status" in filename_lower:
            category = "City Administration"
            service_area = "Civil status"
        else:
            category = "General"
            service_area = "Information"
        
        doc = {
            "title": title.replace("_", " ").title(),
            "content": content,
            "language": "en",
            "category": category,
            "service_area": service_area,
            "source": f"data/raw/uploads/{txt_file.name}",
            "chunk_text": content,
        }
        documents.append(doc)
    
    dataset = {"documents": documents}
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    
    print(f"Created {output_file} with {len(documents)} documents")

if __name__ == "__main__":
    convert_txt_to_json()