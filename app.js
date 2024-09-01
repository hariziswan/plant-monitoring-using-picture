let model;
const webcamElement = document.getElementById('webcam');
const uploadInput = document.getElementById('uploadInput');
const captureButton = document.getElementById('captureButton');
const snapButton = document.getElementById('snapButton');
const predictedLabel = document.getElementById('predictedLabel');
const imageGallery = document.getElementById('imageGallery');

// Initialize Chart.js for prediction graph
const ctx = document.getElementById('predictionGraph').getContext('2d');
const predictionChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Soil', '1 month', '2 month', '3 month', '4 month', 'harvest'],
        datasets: [{
            label: 'Prediction Probability',
            data: [0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

// Load the TensorFlow.js model
async function loadModel() {
    try {
        model = await tf.loadLayersModel('web_model/model.json');
        console.log("Model loaded.");
    } catch (error) {
        console.error("Error loading model: ", error);
        predictedLabel.textContent = "Error loading model. Check console for details.";
    }
}

// Handle multiple image uploads
uploadInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
            const imgElement = document.createElement('img');
            imgElement.src = reader.result;
            imgElement.addEventListener('click', () => predictImage(imgElement));
            imageGallery.appendChild(imgElement);
        };
        reader.readAsDataURL(file);
    });
});

// Initialize the webcam with constraints to use the back camera
async function setupWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }  // Request the back camera
        });
        webcamElement.srcObject = stream;
        document.querySelector('.video-container').classList.remove('hidden');
        return new Promise((resolve) => {
            webcamElement.onloadedmetadata = () => {
                resolve();
            };
        });
    } catch (error) {
        console.error("Error accessing webcam: ", error);
        predictedLabel.textContent = "Error accessing webcam. Check console for details.";
    }
}

// Handle capturing an image from the webcam
captureButton.addEventListener('click', () => {
    setupWebcam();
});

// Capture image from webcam and add to gallery
snapButton.addEventListener('click', () => {
    const canvasElement = document.createElement('canvas');
    const context = canvasElement.getContext('2d');
    canvasElement.width = webcamElement.videoWidth;
    canvasElement.height = webcamElement.videoHeight;
    context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height);
    const dataUrl = canvasElement.toDataURL('image/png');

    // Create and display the captured image in the gallery
    const imgElement = document.createElement('img');
    imgElement.src = dataUrl;
    imgElement.addEventListener('click', () => predictImage(imgElement));
    imageGallery.appendChild(imgElement);
});

// Predict the plant condition from an image
async function predictImage(imageElement) {
    try {
        const img = tf.browser.fromPixels(imageElement).resizeNearestNeighbor([224, 224]).toFloat().expandDims();
        const prediction = await model.predict(img).data();
        const classNames = ['Soil', '1 month', '2 month', '3 month', '4 month', 'harvest'];
        const maxIndex = prediction.indexOf(Math.max(...prediction));
        
        // Update the predicted label and graph
        predictedLabel.textContent = `Plant Condition: ${classNames[maxIndex]}`;
        predictionChart.data.datasets[0].data = Array.from(prediction);
        predictionChart.update();

        // Dispose of the tensor to prevent memory leaks
        img.dispose();
    } catch (error) {
        console.error("Error during prediction: ", error);
        predictedLabel.textContent = "Error during prediction. Check console for details.";
    }
}

// Load the model on page load
loadModel();
