# Obsidian Explain Selection with AI Plugin

This is a plugin for Obsidian (https://obsidian.md).

This plugin provides an additional element to the editor context menu that will prompt an [OpenAI Chat Completion API](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)-compatible AI endpoint to elaborate on the selected text in the surrounding context.

There are three supported ways to set this up:
1. Using OpenAI
2. Using Ollama
3. Running a custom local or remote model

## Using OpenAI (recommended)

The AI endpoint is the parameter that defines the LLM that is used for text generation. If you are using OpenAI models, possible options for this field could be

- `gpt-3.5-turbo`
- `gpt-4o`
- `gpt-4-turbo`

If this is the case for you, you will also need to have the OpenAI key field populated with your API key from OpenAI.

If you wish to use other OpenAI model, perform an advanced custom setup with the `Base URL` set to `https://api.openai.com/v1/` and the endpoint set to your desired OpenAI model.

## Using Ollama

[Ollama](https://www.ollama.com/) is an open-source way to manage locally installed and ran large-language models. Such a system supports the [OpenAI Chat Completion API](https://platform.openai.com/docs/guides/text-generation/chat-completions-api) format, so it has been added as an easy integration with support for `llama3` and `mistral` models.

If you wish to use other models at this time, see the next section on configuring alternative local models, setting the `Base URL` to point at your Ollama instance (`http://localhost:11434/v1/` by default) and then set the `Endpoint` setting to be your desired [Ollama model](https://www.ollama.com/library)

## Using alternative local or remote model (advanced)

If you are not familiar with the [Hugging Face Text Generation Interface (TGI)](https://huggingface.co/docs/text-generation-inference/en/index), it is not recommended to go this route. Having access to models spun up locally or remotely is a prerequisite for successfully using this interface and is beyond the scope of this documentation.

With this in mind, provide the `Base URL` and `Endpoint` settings as well as an optional `API Key` should your setup necessitate that to interface with your local or remote model.

This is ultimately an "under-the-hood" access to the Chat API to be an option for more advanced users or restricted endpoints.
