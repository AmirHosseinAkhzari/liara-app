import os
from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///notes.db"
app.config["UPLOAD_FOLDER"] = "uploads"
db = SQLAlchemy(app)

@app.post("/attach")
def attach():
    f = request.files["file"]
    f.save(os.path.join(app.config["UPLOAD_FOLDER"], f.filename))
    return {"ok": True}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
