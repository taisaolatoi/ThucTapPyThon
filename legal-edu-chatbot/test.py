from google import genai

client = genai.Client(api_key="")

response = client.models.generate_content(
    model="gemini-2.0-flash", contents="giá trị của một con người?"
)
print(response.text)