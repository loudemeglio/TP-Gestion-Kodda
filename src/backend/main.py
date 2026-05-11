from fastapi import FastAPI

# Este es el objeto "app" que busca Uvicorn
app = FastAPI()

@app.get("/")
def home():
    return {"mensaje": "Hola! El backend ya no está vacío y funciona."}