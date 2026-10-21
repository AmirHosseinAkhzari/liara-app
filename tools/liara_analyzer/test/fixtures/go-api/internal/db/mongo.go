package db

import "go.mongodb.org/mongo-driver/v2/mongo"
import "go.mongodb.org/mongo-driver/v2/mongo/options"

func Connect(uri string) (*mongo.Client, error) { return mongo.Connect(options.Client().ApplyURI(uri)) }
