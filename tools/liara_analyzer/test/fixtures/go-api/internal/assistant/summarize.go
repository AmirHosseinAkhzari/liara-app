package assistant

import openai "github.com/sashabaranov/go-openai"

func NewClient(key string) *openai.Client { return openai.NewClient(key) }
