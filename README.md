# Ollama Author

Generate complete novels using Ollama's local language models.

## Overview

Ollama Author is a command-line tool that helps you generate complete novels, including:
- Generating and refining plot ideas
- Creating a detailed storyline with chapters
- Writing each chapter with consistent style
- Packaging everything as an EPUB e-book

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed (v16 or newer)
2. Install [Ollama](https://ollama.ai/) and make sure it's running
3. Download your preferred model (e.g., `ollama pull llama3`)
4. Clone this repository and install dependencies:

```bash
git clone <your-repo-url>
cd OllamaAuthor
npm install
```

## Running Ollama Author

The basic command to generate a novel is:

```bash
node generateNovel.js -prompt "Your fantasy prompt" -numberOfChapters 5 -writingStyle "Your preferred writing style" -model "llama3"
```

### Parameters

- `-prompt`: The initial prompt to generate your novel (if not provided, a default prompt is used)
- `-numberOfChapters`: How many chapters to generate (default: 3)
- `-writingStyle`: Description of the writing style to use (default: young adult with dialogue)
- `-model`: Which Ollama model to use (default: llama3)
- `-output`: Directory to store output files (default: ./output)

### Examples

Generate a 3-chapter sci-fi novel:
```bash
node generateNovel.js -prompt "A colony on Mars discovers an ancient alien artifact" -numberOfChapters 3 -writingStyle "Hard sci-fi with technical details" -model "llama3"
```

Generate a 10-chapter fantasy epic:
```bash
node generateNovel.js -prompt "A kingdom where magic is forbidden after a devastating magical war" -numberOfChapters 10 -writingStyle "Epic fantasy similar to Brandon Sanderson" -model "llama3"
```

## Output

After running the script, you'll find:
- An EPUB file of your novel in the output directory
- A placeholder cover image
- Text files with the original prompts used

## Requirements

- Ollama must be running locally on port 11434 (default)
- Sufficient RAM for your chosen model
- Node.js v16 or newer

## Notes

- Larger models generally produce better quality novels
- Generation can take some time depending on your hardware and the number of chapters
- The more detailed your initial prompt and writing style, the better the results
