from flask import Flask, request, jsonify
from flask_cors import CORS
# Import your existing categorization function
from embed_and_cluster import embed_and_cluster 

app = Flask(__name__)
CORS(app)

@app.route('/categorise', methods=['POST'])
def handle_categorisation():
    data = request.json
    # print("Received data for categorization:", str(data)[:100])  # Print first 100 chars for brevity
    result = embed_and_cluster(data['videos'])

    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000, debug=True)