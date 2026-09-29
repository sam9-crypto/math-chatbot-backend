require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SYSTEM_PROMPT = `You are a math tutor. Solve the problem step by step,
clearly labeling each step. Do NOT use LaTeX formatting (no dollar signs,
no \\frac, \\sqrt, \\times, \\text, \\Rightarrow, \\cdot, \\implies, \\approx,
etc.) — write all math in plain text using symbols like √, ×, ÷, ^, ≈, and
write fractions as "a/b". Keep it concise. If the mode is "quick", give
only the final answer in 1-2 lines. If "steps", show full working, but
keep it reasonably concise — prefer standard methods over lengthy
iterative approximations unless asked. If "alt-method", solve it a second
way after the main solution.`;

app.post('/solve', async (req, res) => {
  try {
    const { question, imageBase64, mode = 'steps' } = req.body;

    const content = [
      { type: 'text', text: `${SYSTEM_PROMPT}\nMode: ${mode}\nQuestion: ${question || '(see image)'}` }
    ];

    if (imageBase64) {
      content.push({
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
      });
    }

    const apiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        messages: [{ role: 'user', content }],
        temperature: 0.3,
        max_tokens: 16000,
      }),
    });

    const data = await apiRes.json();

    console.log('Raw OpenRouter response:', JSON.stringify(data));

if (!apiRes.ok || !data.choices || !data.choices[0]) {
  console.error('OpenRouter error:', data);
  return res.status(500).json({ error: data.error?.message || 'OpenRouter request failed — try again in a moment' });
}
let answer = data.choices[0].message.content;

    answer = answer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    answer = answer.replace(/<think>[\s\S]*$/g, '').trim(); // fallback if thinking got cut off
    console.log('Final answer being sent:', answer);
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to solve' });
  }
});

app.listen(3000, () => console.log('Backend running on port 3000'));