import os
from flask import Flask
from pymongo import MongoClient

app = Flask(__name__)
db = MongoClient(os.environ["FIXTURE_MONGO_URL"])

if __name__ == "__main__":
    app.run(port=5000)
