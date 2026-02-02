🎧 Dictation MVP — Level-based English Dictation System

A minimal but complete dictation training web app built with:

Flask (Python)

SQLite

Vanilla JavaScript

Dynamic audio loading

Level unlocking system

Progress tracking & reset

This project demonstrates how to turn a simple HTML page into a real learning product with backend state, levels, scoring, and persistence.

✨ Features

🔤 Letter-grid dictation input (skip spaces & punctuation)

🎵 Audio dynamically loaded per level

📊 Word-level accuracy analysis (correct / wrong / missing / extra)

🧠 LCS-based token alignment algorithm

🗂 Level system stored in database

🔓 Level unlocking after passing previous level

🏆 Best score tracking per level

🧨 One-click progress reset

👁 Toggle reference sentence (hidden by default)

🏗 Project Structure
project/
│
├── app.py
├── init_db.py
├── dictation.db
│
├── templates/
│   └── index.html
│
└── static/
    ├── audio/
    │   ├── l1.mp3
    │   ├── l2.mp3
    │   └── l3.mp3
    └── favicon.ico

🚀 How to Run
1️⃣ Install dependencies
pip install flask

2️⃣ Initialize database
python init_db.py

3️⃣ Put audio files into:
static/audio/


Filenames must match database entries:

audio/l1.mp3

audio/l2.mp3

audio/l3.mp3

4️⃣ Start server
python app.py


Open browser:

http://127.0.0.1:5000

🧠 How the System Works
Levels Table (levels)

Stores:

title

reference sentence

audio path

pass score

Attempts Table (attempts)

Stores each submission:

accuracy

error breakdown

timestamp

The frontend loads /api/levels once and manages state locally.

🔄 Reset Progress

The app provides a reset button that clears all attempts:

POST /api/reset


This restores the system to a “fresh start” state.

🧩 Core Algorithms
1. Letter Grid Rendering

Maps each character in reference text to:

input cell

space

punctuation placeholder

2. Token Normalization

ignore case

ignore punctuation

3. LCS Token Alignment

Used to classify each word as:

correct

wrong

missing

extra

🛣 Possible Extensions

This MVP is designed to scale into a real product:

👤 Multi-user support

📈 Progress dashboard

🎙 Upload custom audio

🧾 Admin panel to add levels

☁ Deployment to cloud

📱 Mobile UI optimization

🎯 Why This Project Matters

This is not just a webpage — it is a stateful learning application that demonstrates:

Frontend state management without frameworks

Backend persistence with SQLite

Algorithmic feedback for language learning

Product-style feature loop (levels → scoring → unlock → reset)

Perfect as a portfolio project for:

Full-stack development

Educational technology

Flask + JS integration
