from gtts import gTTS
import os

os.makedirs("static/audio", exist_ok=True)

data = [
    ("static/audio/l1.mp3", "The quick brown fox jumps over the lazy dog."),
    ("static/audio/l2.mp3", "I enjoy learning English through daily dictation practice."),
    ("static/audio/l3.mp3", "Consistency beats intensity when building long-term skills."),
]

for path, text in data:
    tts = gTTS(text=text, lang="en")
    tts.save(path)

print("done")
