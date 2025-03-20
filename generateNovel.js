#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import EpubGen from 'epub-gen';
import sharp from 'sharp';

// Setup command-line arguments
program
  .option('-prompt <prompt>', 'Novel prompt')
  .option('-numberOfChapters <number>', 'Number of chapters', parseInt)
  .option('-writingStyle <style>', 'Writing style')
  .option('-model <model>', 'Ollama model to use', 'deepseek-r1:7b')
  .option('-output <path>', 'Output directory', './output')
  .option('-language <language>', 'Output language', 'English')
  .parse(process.argv);

const options = program.opts();
const prompt = options.Prompt || 'A kingdom hidden deep in the forest, where every tree is a portal to another world.';
const numChapters = options.NumberOfChapters || 3; 
const writingStyle = options.WritingStyle || 'Clear and easily understandable, similar to a young adult novel. Lots of dialogue.';
const ollamaModel = options.Model || 'deepseek-r1:7b';
const outputDir = options.Output || './output';
const language = options.Language || 'English';

// Ensure output directory exists
fs.ensureDirSync(outputDir);
fs.ensureDirSync(path.join(outputDir, 'prompts'));

// Helper function to parse Ollama responses and extract thinking content
function parseOllamaResponse(response) {
  // Regex to match <think>...</think> tags
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
  let match;
  let cleanedResponse = response;
  
  // Find all <think></think> blocks
  while ((match = thinkRegex.exec(response)) !== null) {
    // Get the full match (including tags) and the content inside tags
    const [fullMatch, thinkContent] = match;
    
    // Print the think content to console
    console.log('Model thinking:', thinkContent);
    
    // Remove the think block from the response
    cleanedResponse = cleanedResponse.replace(fullMatch, '');
  }
  
  return cleanedResponse.trim();
}

// Helper function to call Ollama API
async function callOllama(prompt, model = ollamaModel) {
  console.log(`Calling Ollama with model: ${model}`);
  
  // Add language instruction to the prompt if language is specified
  const languageInstruction = language ? `Respond in the language ${language}. ` : '';
  const modifiedPrompt = languageInstruction + prompt;
  
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: model, 
        prompt: modifiedPrompt,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // Parse the response to handle <think></think> tags
    return parseOllamaResponse(data.response);
  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw error;
  }
}

// Generate cover image using Ollama (replacement for Stability AI)
async function createCoverImage(plot) {
  // Since Ollama doesn't do text-to-image directly, we'll create a placeholder
  console.log('Creating placeholder cover image...');
  
  // Generate a cover prompt
  const coverPrompt = await generateCoverPrompt(plot);
  
  // Create a placeholder cover with text
  const width = 512;
  const height = 768;
  
  // For a real implementation, you might want to use a text-to-image API here
  // For now, we'll just create a gradient placeholder with the title text
  
  // Save the placeholder as cover.png
  const coverPath = path.join(outputDir, 'cover.png');
  
  // Use sharp to create a simple gradient image
  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 100, g: 100, b: 200, alpha: 1 }
    }
  })
  .png()
  .toFile(coverPath);
  
  console.log(`Cover image created at ${coverPath}`);
  return coverPath;
}

async function generateCoverPrompt(plot) {
  const prompt = `You are a creative assistant that writes a spec for the cover art of a book, based on the book's plot.
  
  Plot: ${plot}
  
  Describe the cover we should create, based on the plot. This should be two sentences long, maximum.`;

  return await callOllama(prompt);
}

// All the functions ported from the Python notebook

async function generatePlots(prompt) {
  console.log("Generating plots...");
  const promptText = `You are a creative assistant that generates engaging fantasy novel plots.
  
  Generate 10 fantasy novel plots based on this prompt: ${prompt}`;

  const response = await callOllama(promptText);
  return response.split('\n');
}

async function selectMostEngaging(plots) {
  console.log("Selecting most engaging plot...");
  const promptText = `You are an expert in writing fantastic fantasy novel plots.
  
  Here are a number of possible plots for a new novel: ${plots}
  
  Now, write the final plot that we will go with. It can be one of these, a mix of the best elements of multiple, or something completely new and better. The most important thing is the plot should be fantastic, unique, and engaging.`;

  return await callOllama(promptText);
}

async function improvePlot(plot) {
  console.log("Improving plot...");
  const promptText = `You are an expert in improving and refining story plots.
  
  Improve this plot: ${plot}`;

  return await callOllama(promptText);
}

async function getTitle(plot) {
  console.log("Generating title...");
  const promptText = `You are an expert writer.
  
  Here is the plot: ${plot}
  
  What is the title of this book? Just respond with the title, do nothing else.`;

  return await callOllama(promptText);
}

async function writeFirstChapter(plot, firstChapterTitle, writingStyle) {
  console.log("Writing first chapter...");
  const promptText = `You are a world-class fantasy writer.
  
  Here is the high-level plot to follow: ${plot}
  
  Write the first chapter of this novel: \`${firstChapterTitle}\`.
  
  Make it incredibly unique, engaging, and well-written.
  
  Here is a description of the writing style you should use: \`${writingStyle}\`
  
  Include only the chapter text. There is no need to rewrite the chapter name.`;

  const firstDraft = await callOllama(promptText);
  
  // Now improve the first draft
  const improvePrompt = `You are a world-class fantasy writer. Your job is to take your student's rough initial draft of the first chapter of their fantasy novel, and rewrite it to be significantly better, with much more detail.
  
  Here is the high-level plot you asked your student to follow: ${plot}
  
  Here is the first chapter they wrote: ${firstDraft}
  
  Now, rewrite the first chapter of this novel, in a way that is far superior to your student's chapter. It should still follow the exact same plot, but it should be far more detailed, much longer, and more engaging. Here is a description of the writing style you should use: \`${writingStyle}\``;

  return await callOllama(improvePrompt);
}

async function writeChapter(previousChapters, plot, chapterTitle) {
  console.log(`Writing chapter with title: ${Object.keys(chapterTitle)[0]}`);
  
  const promptText = `You are a world-class fantasy writer.
  
  Plot: ${plot}
  Previous Chapters: ${previousChapters}
  
  Write the next chapter of this novel, following the plot and taking in the previous chapters as context. Here is the plan for this chapter: ${JSON.stringify(chapterTitle)}
  
  Write it beautifully. Include only the chapter text. There is no need to rewrite the chapter name.`;

  const response = await callOllama(promptText);
  
  // Check if the response is too short, and if so, try again
  if (response.length < 1000) {
    console.log('Chapter too short. Trying again...');
    return await writeChapter(previousChapters, plot, chapterTitle);
  }
  
  return response;
}

function extractJsonFromMarkdown(text) {
  // Look for JSON code blocks
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(jsonRegex);
  
  if (match && match[1]) {
    // Return just the JSON content
    return match[1].trim();
  }
  
  // Return the original text if no JSON block is found
  return text;
}

async function generateStoryline(plot, numChapters) {
  console.log("Generating storyline with chapters and high-level details...");
  
  const jsonFormat = `[{"Chapter CHAPTER_NUMBER_HERE - CHAPTER_TITLE_GOES_HERE": "CHAPTER_OVERVIEW_AND_DETAILS_GOES_HERE"}, ...]`;
  
  const promptText = `You are a world-class fantasy writer. Your job is to write a detailed storyline, complete with chapters, for a fantasy novel. Don't be flowery -- you want to get the message across in as few words as possible. But those words should contain lots of information.
  
  Write a fantastic storyline with ${numChapters} chapters and high-level details based on this plot: ${plot}.
  
  output the response in a json format following this template ${jsonFormat}`; // Do it in this list of dictionaries format

  const initialResponse = await callOllama(promptText);
  
  // Now improve the storyline
  const improvePrompt = `You are a world-class fantasy writer. Your job is to take your student's rough initial draft of the storyline of a fantasy novel, and rewrite it to be significantly better.
  
  Here is the draft storyline they wrote: ${initialResponse}
  
  Now, rewrite the storyline, in a way that is far superior to your student's version. It should have the same number of chapters, but it should be much improved in as many ways as possible. Remember to do it in this list of dictionaries format ${jsonFormat}`;

  const improvedResponse = await callOllama(improvePrompt);
  // Extract JSON content if present in the markdown response
  return extractJsonFromMarkdown(improvedResponse);
}

function writeToFile(prompt, content) {
  const validFilename = prompt.replace(/[^a-z0-9._ ]/gi, '').trim();
  const filePath = path.join(outputDir, 'prompts', `${validFilename}.txt`);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Output for prompt "${prompt}" has been written to ${filePath}`);
}

async function createEpub(title, author, chapters, coverImagePath) {
  console.log("Creating EPUB file...");
  
  const content = chapters.map((chapterObj) => {
    const chapterTitle = Object.keys(chapterObj)[0];
    const chapterContent = chapterObj[chapterTitle];
    
    // Format chapter content with paragraphs
    const formattedContent = chapterContent
      .split('\n')
      .filter(para => para.trim())
      .map(para => `<p>${para}</p>`)
      .join('');
    
    return {
      title: chapterTitle.includes(' - ') ? chapterTitle.split(' - ')[1] : chapterTitle,
      data: `<h1>${chapterTitle}</h1>${formattedContent}`
    };
  });
  
  const options = {
    title,
    author,
    cover: coverImagePath,
    content
  };
  
  const epubPath = path.join(outputDir, `${title}.epub`);
  return new Promise((resolve, reject) => {
    new EpubGen(options, epubPath)
      .promise
      .then(() => {
        console.log(`EPUB file created at ${epubPath}`);
        resolve(epubPath);
      })
      .catch(err => {
        console.error('Error creating EPUB:', err);
        reject(err);
      });
  });
}

async function writeFantasyNovel(prompt, numChapters, writingStyle) {
  const plots = await generatePlots(prompt);
  console.log('Generated plots');
  
  const bestPlot = await selectMostEngaging(plots);
  console.log('Selected best plot');
  
  const improvedPlot = await improvePlot(bestPlot);
  console.log('Plot improved');
  
  const title = await getTitle(improvedPlot);
  console.log(`Title generated: ${title}`);
  
  const storyline = await generateStoryline(improvedPlot, numChapters);
  console.log('Storyline generated');
  
  // Parse the storyline JSON
  let chapterTitles;
  try {
    chapterTitles = JSON.parse(storyline);
  } catch (error) {
    console.error('Error parsing storyline JSON:', error);
    console.log('Storyline response:', storyline);
    
    // Create a fallback structure if parsing fails
    chapterTitles = Array.from({ length: numChapters }, (_, i) => ({
      [`Chapter ${i+1} - Untitled`]: `This is chapter ${i+1}`
    }));
  }
  
  let novel = `Storyline:\n${storyline}\n\n`;
  
  // Write first chapter
  const firstChapter = await writeFirstChapter(storyline, chapterTitles[0], writingStyle);
  console.log('First chapter written');
  novel += `Chapter 1:\n${firstChapter}\n`;
  
  const chapters = [firstChapter];
  const chapterObjects = [{ [Object.keys(chapterTitles[0])[0]]: firstChapter }];
  
  // Write remaining chapters
  for (let i = 1; i < numChapters; i++) {
    console.log(`Writing chapter ${i+1}...`);
    
    const chapter = await writeChapter(novel, storyline, chapterTitles[i]);
    novel += `Chapter ${i+1}:\n${chapter}\n`;
    chapters.push(chapter);
    chapterObjects.push({ [Object.keys(chapterTitles[i])[0]]: chapter });
  }
  
  return { novel, title, chapters, chapterObjects };
}

// Main execution
(async () => {
  try {
    console.log(`Starting novel generation with prompt: "${prompt}"`);
    console.log(`Number of chapters: ${numChapters}`);
    console.log(`Writing style: "${writingStyle}"`);
    
    // Generate the novel
    const { novel, title, chapters, chapterObjects } = await writeFantasyNovel(prompt, numChapters, writingStyle);
    
    // Write novel to file
    writeToFile(prompt, novel);
    
    // Create cover image
    const coverPath = await createCoverImage(JSON.stringify(chapterObjects));
    
    // Create ebook
    await createEpub(title, 'Ollama Author', chapterObjects, coverPath);
    
    console.log('Novel generation complete!');
    
  } catch (error) {
    console.error('Error during novel generation:', error);
  }
})();