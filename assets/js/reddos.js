const mainContainer = document.querySelector(".mainContainer");
const animationCanvas = document.querySelector("canvas.backgroundAnimation");
const pixelDensity = Math.min(window.devicePixelRatio, 2);

const pointerState = {
    xPos: 0,
    yPos: 0,
    targetX: 0,
    targetY: 0,
};

let shaderUniforms;
const glInstance = setupShaders();

initializeEvents();

updateCanvasSize();
window.addEventListener("resize", updateCanvasSize);

startRendering();

function setupShaders() {
    const vertexSource = document.getElementById("vertexShaderAlt").innerHTML;
    const fragmentSource = document.getElementById("fragmentShaderAlt").innerHTML;

    const glContext = animationCanvas.getContext("webgl") || animationCanvas.getContext("experimental-webgl");

    if (!glContext) {
        alert("WebGL no es compatible con este navegador.");
    }

    function createShader(glContext, source, type) {
        const shader = glContext.createShader(type);
        glContext.shaderSource(shader, source);
        glContext.compileShader(shader);

        if (!glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)) {
            console.error("Error al compilar los shaders: " + glContext.getShaderInfoLog(shader));
            glContext.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = createShader(glContext, vertexSource, glContext.VERTEX_SHADER);
    const fragmentShader = createShader(glContext, fragmentSource, glContext.FRAGMENT_SHADER);

    function createShaderProgram(glContext, vertex, fragment) {
        const program = glContext.createProgram();
        glContext.attachShader(program, vertex);
        glContext.attachShader(program, fragment);
        glContext.linkProgram(program);

        if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)) {
            console.error("No se pudo inicializar el programa de shaders: " + glContext.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    const shaderProgram = createShaderProgram(glContext, vertexShader, fragmentShader);
    shaderUniforms = retrieveUniforms(shaderProgram);

    function retrieveUniforms(program) {
        let uniformList = [];
        let uniformCount = glContext.getProgramParameter(program, glContext.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            let uniformName = glContext.getActiveUniform(program, i).name;
            uniformList[uniformName] = glContext.getUniformLocation(program, uniformName);
        }
        return uniformList;
    }

    const vertexPositions = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

    const buffer = glContext.createBuffer();
    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
    glContext.bufferData(glContext.ARRAY_BUFFER, vertexPositions, glContext.STATIC_DRAW);

    glContext.useProgram(shaderProgram);

    const positionAttrib = glContext.getAttribLocation(shaderProgram, "position");
    glContext.enableVertexAttribArray(positionAttrib);

    glContext.bindBuffer(glContext.ARRAY_BUFFER, buffer);
    glContext.vertexAttribPointer(positionAttrib, 2, glContext.FLOAT, false, 0, 0);

    return glContext;
}

function startRendering() {
    const timeNow = performance.now();

    pointerState.xPos += (pointerState.targetX - pointerState.xPos) * .5;
    pointerState.yPos += (pointerState.targetY - pointerState.yPos) * .5;

    glInstance.uniform1f(shaderUniforms.timeUniform, timeNow);
    glInstance.uniform2f(shaderUniforms.pointerUniform, pointerState.xPos / window.innerWidth, 1 - pointerState.yPos / window.innerHeight);
    glInstance.uniform1f(shaderUniforms.scrollUniform, window["pageYOffset"] / (2 * window.innerHeight));

    glInstance.drawArrays(glInstance.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(startRendering);
}

function updateCanvasSize() {
    animationCanvas.width = window.innerWidth * pixelDensity;
    animationCanvas.height = window.innerHeight * pixelDensity;
    glInstance.uniform1f(shaderUniforms.aspectUniform, animationCanvas.width / animationCanvas.height);
    glInstance.viewport(0, 0, animationCanvas.width, animationCanvas.height);
}

function initializeEvents() {
    window.addEventListener("pointermove", e => {
        updatePointer(e.clientX, e.clientY);
    });
    window.addEventListener("touchmove", e => {
        updatePointer(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
    });
    window.addEventListener("click", e => {
        updatePointer(e.clientX, e.clientY);
    });

    function updatePointer(x, y) {
        pointerState.targetX = x;
        pointerState.targetY = y;
    }
}

