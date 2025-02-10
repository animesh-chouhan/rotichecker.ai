document.getElementById('upload').addEventListener('change', function (event) {
    let file = event.target.files[0];
    if (!file) return;

    let img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = function () {
        processRoti(img);
    };
});

function processRoti(img) {
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    // Resize canvas
    canvas.width = img.width / 2;
    canvas.height = img.height / 2;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Load image into OpenCV
    let src = cv.imread(canvas);
    let gray = new cv.Mat();
    let blurred = new cv.Mat();
    let edges = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 50, 150);

    // Find contours
    cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    // cv.imshow(canvas, contours)

    let maxContour = null;
    let maxArea = 0;

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let area = cv.contourArea(contour);
        if (area > maxArea) {
            maxArea = area;
            maxContour = contour;
        }
    }

    if (maxContour) {
        let enclosingCircle = cv.minEnclosingCircle(maxContour);
        let center = enclosingCircle.center;
        let radius = enclosingCircle.radius;

        // Draw detected circle
        cv.circle(src, center, radius, [0, 255, 0, 255], 5);

        let numSegments = 1000; // More segments for smooth transition
        let angleStep = (2 * Math.PI) / numSegments;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Ensure existing image stays

        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = 1;

        ctx.lineWidth = 10;


        for (let i = 0; i < numSegments; i++) {
            let angle = i * angleStep;
            let nextAngle = (i + 1) * angleStep;

            let x1 = center.x + radius * Math.cos(angle);
            let y1 = center.y + radius * Math.sin(angle);
            let x2 = center.x + radius * Math.cos(nextAngle);
            let y2 = center.y + radius * Math.sin(nextAngle);

            let dist = Math.abs(cv.pointPolygonTest(maxContour, { x: x1, y: y1 }, true));
            let deviationRatio = dist / radius; // Normalize deviation

            // Get smoothly transitioning color
            let color = getDeviationColor(deviationRatio, 0.002, 0.09);
            // console.log(deviationRatio)
            ctx.strokeStyle = color;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Function to smoothly transition color from Green → Yellow → Red
        function getDeviationColor(value, min, max) {
            let ratio = Math.min(1, Math.max(0, (value - min) / (max - min)));

            let r = Math.round(255 * ratio);
            let g = Math.round(255 * (1 - ratio));
            let b = 0;

            return `rgb(${r},${g},${b}, 1)`;
        }

        // Calculate roundness
        let perimeter = cv.arcLength(maxContour, true);
        let circularity = (4 * Math.PI * maxArea) / (perimeter * perimeter);
        let score = Math.round(circularity * 100); // Normalize to 0-100

        document.getElementById('score').innerText = `Roundness Score: ${score}`;
    }

    // cv.imshow('canvas', src);

    // Cleanup
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
}