//https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript

Page = {};
// canvas variables
Page.$canvas = null;
Page.$overlayCanvas = null;
Page.$context = null;
Page.$overlayContext = null;
Page.canvasHeight = 660;
Page.canvasWidth = 1140;
Page.intervalId = null;
Page.isRendering = false;
Page.isCountingDown = false;
Page.isOverlaying = false;
Page.countdownTimeouts = [];
// ball variables
Page.ballX = null;
Page.ballY = null;
Page.ballDX = null;
Page.ballDY = null;
Page.ballRadius = 10;
Page.ballSpeed = 6;
Page.ballSpeedMin = 3;
Page.maxBounceAngle = 17 * Math.PI / 18; // 170 degrees
// paddle variables
Page.paddleHeight = 10;
Page.paddleWidth = 75;
Page.paddleX = null;
Page.paddleDX = null;
Page.rightPressed = false;
Page.leftPressed = false;
// brick variables
Page.brickRowCount = 10;
Page.brickColumnCount = 15;
Page.brickWidth = 75;
Page.brickHeight = 20;
Page.brickPadding = 1;
Page.brickOffsetLeft = 0;
Page.brickOffsetTop = 30;
Page.brickCornerRadius = 10;
Page.bricksToDestory = -1;
Page.bricks = [];
Page.brickColors = [];
// particle variables
Page.particles = [];
Page.numberOfParticles = 15;
Page.particleRadiusDecrease = 0.3;
// player stats
Page.score = 0;
Page.lives = 2;
Page.level = 0;
Page.isGameOver = false;
Page.numberOfLevels = 8;
// options
Page.enableRainbow = true;
Page.enableParticles = true;
Page.enableCountdown = true;
Page.extraParticles = false;

Page.defaults = {};
Page.defaults.numberOfParticles = 15;
Page.defaults.particleRadiusDecrease = 0.3;
Page.defaults.brickRowCount = 10;
Page.defaults.brickColumnCount = 15;
Page.defaults.brickWidth = 75;
Page.defaults.brickOffsetLeft = 0;

Page.initialize = function () {
    Page.$canvas = $('#breakout-canvas');
    Page.$context = Page.$canvas[0].getContext('2d');
    Page.$overlayCanvas = $('#overlay-canvas');
    Page.$overlayContext = Page.$overlayCanvas[0].getContext('2d');

    Page.initializeCanvas();
    Page.initializeEventListener();
    Page.initializeBricks();
    Page.start();
};

//#region Set up

Page.initializeCanvas = function () {
    // set up ball variables
    Page.ballX = Page.canvasWidth / 2;
    Page.ballY = Page.canvasHeight - 30;

    // randomize the starting ball direction
    if (Math.round(Math.random())) {
        Page.ballDX = -Page.ballSpeed;
        Page.ballDY = -Page.ballSpeed - Math.random() * 4;
    } else {
        Page.ballDX = Page.ballSpeed;
        Page.ballDY = -Page.ballSpeed + Math.random() * 4;
    }

    // set up paddle variables
    Page.resetPaddle();
    Page.paddleDX = Page.ballSpeed * 2;
};

Page.initializeEventListener = function () {
    // keyboard input
    $(document).on('keydown', function (e) {
        if (e.keyCode === 39) {
            Page.rightPressed = true;
        } else if (e.keyCode === 37) {
            Page.leftPressed = true;
        } else if (e.keyCode === 32) {
            if (Page.isRendering) {
                Page.stop();
                Page.drawCenteredText('PAUSED');
                if (Page.isCountingDown) {
                    Page.countdownInterrupted();
                }
            } else if (!Page.isGameOver) {
                Page.closeOptions();
                $('#game-over-modal').modal('hide');
                $('#how-to-play-modal').modal('hide');
                Page.start();
            }
        }
    });

    $(document).on('keyup', function (e) {
        if (e.keyCode === 39) {
            Page.rightPressed = false;
        } else if (e.keyCode === 37) {
            Page.leftPressed = false;
        }
    });
};

Page.initializeBricks = function () {
    Page.bricks = [];
    Page.getNextLevel();
    Page.initializeBrickColors();
};

Page.initializeBrickColors = function () {
    Page.brickColors = [];
    if (Page.enableRainbow) {
        for (var i = 0; i < Page.brickRowCount; i++) {
            Page.brickColors.push(Page.generageColor(Page.brickRowCount, i + 1));
        }
    } else {
        for (var i = 0; i < Page.brickRowCount; i++) {
            Page.brickColors.push('#0095DD');
        }
    }
};

//#endregion Set up

//#region Game Loop

Page.start = function () {
    if (!Page.intervalId) {
        Page.isRendering = true;
        Page.$canvas.addClass('hide-cursor');
        Page.$overlayCanvas.addClass('hide-cursor');
        if (Page.enableCountdown) {
            Page.countdown();
        } else {
            Page.addMouseListener();
            Page.draw();
        }
    }
};

Page.stop = function () {
    Page.isRendering = false;
    if (Page.intervalId) {
        Page.removeMouseListener();
        cancelAnimationFrame(Page.intervalId);
        Page.intervalId = null;
        Page.isRendering = false;
        Page.$canvas.removeClass('hide-cursor');
        Page.$overlayCanvas.removeClass('hide-cursor');
    }
};

Page.countdown = function () {
    Page.isCountingDown = true;
    Page.removeMouseListener();
    Page.drawRequired();
    Page.drawCenteredText('3');

    Page.countdownTimeouts.push(setTimeout(function () {
        Page.drawRequired();
        Page.drawCenteredText('2');
    }, 1000));
    Page.countdownTimeouts.push(setTimeout(function () {
        Page.drawRequired();
        Page.drawCenteredText('1');
    }, 2000));
    Page.countdownTimeouts.push(setTimeout(function () {
        Page.isCountingDown = false;
        Page.addMouseListener();
        Page.draw();
    }, 3000));
};

Page.countdownInterrupted = function () {
    Page.isCountingDown = false;
    for (var i = 0; i < Page.countdownTimeouts.length; i++) {
        clearTimeout(Page.countdownTimeouts[i]);
    }
    Page.countdownTimeouts = [];
    Page.drawRequired();
    Page.drawCenteredText('PAUSED');
};

Page.drawRequired = function () {
    // clear canvas
    Page.$context.clearRect(0, 0, Page.canvasWidth, Page.canvasHeight);

    // fill canvas
    Page.drawBall();
    Page.drawPaddle();
    Page.drawBricks();
    Page.drawText();
};

Page.draw = function () {
    Page.intervalId = window.requestAnimationFrame(Page.draw);

    // check for collisions
    Page.collisionCheck();

    // update the ball position
    Page.ballX += Page.ballDX;
    Page.ballY += Page.ballDY;

    // update the paddle position
    if (Page.rightPressed && Page.paddleX < Page.canvasWidth - Page.paddleWidth) {
        Page.paddleX += Page.paddleDX;
    } else if (Page.leftPressed && Page.paddleX > 0) {
        Page.paddleX -= Page.paddleDX;
    }

    // draw on the canvas
    Page.drawRequired();

    if (Page.particles.length > 0) {
        for (var i = 0; i < Page.particles.length; i++) {
            Page.particles[i].draw();
        }
    }
};

Page.drawBall = function () {
    Page.$context.beginPath();
    // center X, center Y, radius, start angle, end angle
    Page.$context.arc(Page.ballX, Page.ballY, Page.ballRadius, 0, Math.PI * 2);
    Page.$context.fillStyle = '#0095DD';
    Page.$context.fill();
    Page.$context.closePath();
    if (Page.isOverlaying) {
        Page.drawSpotlight();
    }
};

Page.drawPaddle = function () {
    Page.$context.beginPath();
    Page.$context.rect(Page.paddleX, Page.canvasHeight - Page.paddleHeight, Page.paddleWidth, Page.paddleHeight);
    Page.$context.fillStyle = '#0095DD';
    Page.$context.fill();
    Page.$context.closePath();
};

Page.resetPaddle = function () {
    Page.paddleX = (Page.canvasWidth - Page.paddleWidth) / 2;
};

Page.drawBricks = function () {
    for (var i = 0; i < Page.brickColumnCount; i++) {
        for (var j = 0; j < Page.brickRowCount; j++) {
            if (Page.bricks[i][j].destroyed === false) {
                Page.bricks[i][j].x = (i * (Page.brickWidth + Page.brickPadding)) + Page.brickOffsetLeft;
                Page.bricks[i][j].y = (j * (Page.brickHeight + Page.brickPadding)) + Page.brickOffsetTop;

                Page.$context.beginPath();
                Page.$context.rect(Page.bricks[i][j].x, Page.bricks[i][j].y, Page.brickWidth, Page.brickHeight);
                Page.$context.fillStyle = Page.brickColors[j];
                Page.$context.fill();
                Page.$context.closePath();
            }
        }
    }
};

Page.drawSpotlight = function () {
    // feels kinda hack-ish
    Page.$overlayCanvas.attr('width', Page.canvasWidth);
    Page.createOverlay();

    // x0, y0, r0, x1, y1, r1
    var gradient = Page.$overlayContext.createRadialGradient(Page.ballX, Page.ballY, 0, Page.ballX, Page.ballY, 150);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
    Page.$overlayContext.fillStyle = gradient;
    Page.$overlayContext.fillRect(0, 0, Page.canvasWidth, Page.canvasHeight);
};

Page.drawText = function () {
    Page.drawScore();
    Page.drawLives();
    Page.drawLevel();
};

Page.drawScore = function () {
    Page.$context.font = '16px Arial';
    Page.$context.fillStyle = '#0095DD';
    // text, x, y
    Page.$context.fillText('Score: ' + Page.score, 8, 20);
};

Page.drawLives = function () {
    Page.$context.font = '16px Arial';
    Page.$context.fillStyle = '#0095DD';
    Page.$context.fillText('Lives: ' + Page.lives, Page.canvasWidth - 65, 20);
};

Page.drawLevel = function () {
    Page.$context.font = '16px Arial';
    Page.$context.textAlign = 'center';
    Page.$context.fillStyle = '#0095DD';
    Page.$context.fillText('Level: ' + Page.level, Page.canvasWidth / 2, 20);
    Page.$context.textAlign = 'start';
};

Page.drawCenteredText = function (text) {
    Page.$context.font = '60px Arial';
    Page.$context.textAlign = 'center';
    Page.$context.strokeText(text, Page.canvasWidth / 2, Page.canvasHeight / 2 + 20);
    Page.$context.textAlign = 'start';
};

//#region Particles

var Particle = function (x, y, hex) {
    this.hex = hex;
    this.x = x;
    this.y = y;
    this.radius = (function () { return rand(7, 2) })();
    this.vx = (function () { return Math.random() * 3 - 2 })();
    this.vy = (function () { return Math.random() * 3 - 2 })();
    this.opacity = (function () { return Math.random() + 0.5 })();
    this.alive = true;
};

Particle.prototype.draw = function () {
    this.alive = true;
    this.x += this.vx;
    this.y += this.vy;
    this.radius = Math.abs(this.radius - Page.particleRadiusDecrease);
    Page.$context.beginPath();
    Page.$context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
    Page.$context.fillStyle = this.hex;
    Page.$context.fill();

    // reset particle
    if (this.radius <= 0.3) {
        this.alive = false;
    }
};

Page.createParticles = function (brickX, brickY, row) {
    var hex = Page.brickColors[row];
    var x = brickX + (Page.brickWidth / 2);
    // remove 'dead' particles
    Page.particles = $.grep(Page.particles, function (p) {
        return p.alive === true;
    });

    for (var i = 0; i < Page.numberOfParticles; i++) {
        Page.particles.push(new Particle(x, brickY, hex));
    }
};

//#endregion Particles

//#endregion Game Loop

//#region Collision Detection

Page.collisionCheck = function () {
    Page.wallCollisionCheck();
    Page.brickCollisionCheck();
};

Page.wallCollisionCheck = function () {
    // horizontal
    if ((Page.ballX + Page.ballDX < Page.ballRadius) ||
		(Page.ballX + Page.ballDX > Page.canvasWidth - Page.ballRadius)) {
        Page.ballDX = -Page.ballDX;
    }

    // vertical
    if ((Page.ballY + Page.ballDY < Page.ballRadius)) {
        Page.ballDY = -Page.ballDY;
    } else if (Page.ballY + Page.ballDY > Page.canvasHeight - Page.ballRadius) {
        if (Page.ballX + Page.ballRadius > Page.paddleX &&
			Page.ballX - Page.ballRadius < Page.paddleX + Page.paddleWidth) {
            // ball hit paddle
            Page.relativeCollisionCalc(Page.paddleX, Page.paddleWidth);
        } else {
            // ball passed the paddle
            Page.lives--;
            if (Page.lives < 0) {
                // out of lives
                console.log('Game over');
                Page.gameOver();
            } else {
                Page.ballX = Page.canvasWidth / 2;
                Page.ballY = Page.canvasHeight - 30;
                Page.ballDX = -Page.ballSpeed;
                Page.ballDY = -Page.ballSpeed;
                Page.resetPaddle();
                Page.stop();
                Page.start();
            }
        }
    }
};

Page.brickCollisionCheck = function () {
    for (var i = 0; i < Page.brickColumnCount; i++) {
        for (var j = 0; j < Page.brickRowCount; j++) {
            var brick = Page.bricks[i][j];
            if (brick.destroyed === false) {
                if (Page.ballX + Page.ballRadius > brick.x && Page.ballX - Page.ballRadius < brick.x + Page.brickWidth &&
					Page.ballY + Page.ballRadius > brick.y && Page.ballY - Page.ballRadius < brick.y + Page.brickHeight) {
                    Page.relativeCollisionCalc(brick.x, Page.brickWidth);
                    // remove brick that has been hit
                    brick.destroyed = true;

                    if (Page.enableParticles) {
                        Page.createParticles(brick.x, brick.y, j);
                    }

                    Page.score++;
                    Page.bricksToDestory--;
                    if (Page.bricksToDestory === 0) {
                        // level passed, go to next level
                        console.log('level complete');
                        Page.levelComplete();
                    }

                    return;
                }
            }
        }
    }
};

Page.relativeCollisionCalc = function (x, width) {
    // update ballDY so that the ball bounces off at an angle relative to where it hit
    var relativeX = (x + (width / 2)) - Page.ballX;
    var normalizedRelativeX = relativeX / (width / 2);
    var bounceAngle = normalizedRelativeX * Page.maxBounceAngle;
    bounceAngle = bounceAngle < 0.3 ? bounceAngle + 0.1 : bounceAngle;
    if (Page.ballDY > 0) {
        Page.ballDY = -Page.ballSpeed - bounceAngle;
        if (Page.ballDY > -Page.ballSpeedMin) {
            Page.ballDY = -Page.ballSpeedMin;
        }
    } else {
        Page.ballDY = Page.ballSpeed + bounceAngle;
        if (Page.ballDY < Page.ballSpeedMin) {
            Page.ballDY = Page.ballSpeedMin;
        }
    }
};

//#endregion Collision Detection

//#region Options

Page.howToPlay = function () {
    Page.stop();
    $('#how-to-play-modal').modal('show');
};

Page.rainbowOption = function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if (target.tagName === 'DIV') return;
    Page.enableRainbow = !Page.enableRainbow;
    Page.initializeBrickColors();
};

Page.particleOption = function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if (target.tagName === 'DIV') return;
    Page.enableParticles = !Page.enableParticles;
};

Page.increaseParticles = function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if (target.tagName === 'DIV') return;
    Page.extraParticles = !Page.extraParticles;
    if (Page.extraParticles) {
        Page.numberOfParticles = 200;
        Page.particleRadiusDecrease = 0.1;
    } else {
        Page.numberOfParticles = Page.defaults.numberOfParticles;
        Page.particleRadiusDecrease = Page.defaults.particleRadiusDecrease;
    }
};

Page.countdownOption = function (e) {
    e = e || window.event;
    var target = e.target || e.srcElement;
    if (target.tagName === 'DIV') return;
    Page.enableCountdown = !Page.enableCountdown;
};

Page.restartOption = function () {
    Page.gameOverModal();
};

Page.openOptions = function () {
    $('#options-side-menu').css('width', '250px');
    if (!Page.isGameOver) {
        Page.stop();
        Page.drawCenteredText('PAUSED');
        if (Page.isCountingDown) {
            Page.countdownInterrupted();
        }
    }
};

Page.closeOptions = function () {
    $('#options-side-menu').css('width', '0');
};

//#endregion Options

//#region Helpers

Page.generageColor = function (numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering).
    // This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from:
    // http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch (i % 6) {
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    var c = "#" + ("00" + (~~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
};

var rand = function (max, min) {
    var num = min + (max - min) * Math.random();
    return num;
};

Page.resetDefaults = function () {
    Page.brickRowCount = Page.defaults.brickRowCount;
    Page.brickColumnCount = Page.defaults.brickColumnCount;
    Page.brickWidth = Page.defaults.brickWidth;
    Page.brickOffsetLeft = Page.defaults.brickOffsetLeft;
};

Page.getBricksToDestroy = function () {
    Page.bricksToDestory = 0;
    for (var i = 0; i < Page.bricks.length; i++) {
        for (var j = 0; j < Page.bricks[i].length; j++) {
            if (Page.bricks[i][j].destroyed === false) {
                Page.bricksToDestory++;
            }
        }
    }
};

Page.addMouseListener = function () {
    $(document).on('mousemove', function (e) {
        var relativeX = e.clientX - Page.$canvas[0].offsetLeft;
        if (relativeX > 0 && relativeX < Page.canvasWidth) {
            if (relativeX + Page.paddleWidth > Page.canvasWidth) {
                Page.paddleX = Page.canvasWidth - Page.paddleWidth;
            } else {
                Page.paddleX = relativeX;
            }
        }
    });
};

Page.removeMouseListener = function () {
    $(document).off('mousemove');
};

Page.createOverlay = function () {
    // Make it black
    Page.$overlayContext.fillStyle = '#000';
    Page.$overlayContext.fillRect(0, 0, Page.canvasWidth, Page.canvasHeight);

    // Turn canvas into mask
    Page.$overlayContext.globalCompositeOperation = "destination-out";
};

Page.removeOverlay = function () {
    Page.$overlayCanvas.css('display', 'none');
    Page.isOverlaying = false;
};

//#endregion Helpers

//#region Levels

Page.levelComplete = function () {
    Page.stop();
    Page.resetDefaults();
    Page.setupNextLevel();
};

Page.getNextLevel = function () {
    Page.level++;
    if (Page.level > Page.numberOfLevels) {
        console.log('no more levels');
        Page.removeOverlay();
        Page.gameOver();
        return;
    }

    Page.removeOverlay();

    switch (Page.level) {
        case 1:
            Page.level1();
            break;
        case 2:
            Page.level2();
            break;
        case 3:
            Page.level3();
            break;
        case 4:
            Page.level4();
            break;
        case 5:
            Page.level5();
            break;
        case 6:
            Page.level6();
            break;
        case 7:
            Page.level7();
            break;
        case 8:
            Page.level8();
            break;
        default:
            Page.level1();
            break;
    }

    Page.getBricksToDestroy();
};

Page.setupNextLevel = function () {
    Page.ballX = Page.canvasWidth / 2;
    Page.ballY = Page.canvasHeight - 30;
    Page.ballDX = -Page.ballSpeed;
    Page.ballDY = -Page.ballSpeed;
    Page.resetPaddle();
    Page.bricks = [];
    Page.isGameOver = false;

    Page.closeOptions();
    Page.initializeBricks();
    Page.start();
};

Page.level1 = function () {
    // 4 x 7 block
    Page.brickColumnCount = 7;
    Page.brickRowCount = 4;
    Page.brickWidth = 150;
    Page.brickOffsetLeft = 40;

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: false };
        }
    }
};

Page.level2 = function () {
    // columns
    var bool = false;

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        bool = !bool;
        for (var j = 0; j < Page.brickRowCount; j++) {
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: bool };
        }
    }
};

Page.level3 = function () {
    // mesh
    var bool = true;
    Page.brickRowCount = 7;

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            bool = !bool;
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: bool };
        }
    }
};

Page.level4 = function () {
    // mirrored
    var bool = false;
    Page.brickRowCount = 7;

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            bool = !(j - i > -1 || j - i < -7);
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: bool };
        }
    }
};

Page.level5 = function () {
    // mirrored inverse
    var arr = [];
    var bool = false;
    Page.brickRowCount = 7;

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            bool = (j - i > -1 || j - i < -7);
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: bool };
        }
    }
};

Page.level6 = function () {
    // split screen
    var bool = false;
    Page.brickRowCount = 7;

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            bool = !((j - i < -7) || (j + i < Page.brickRowCount));
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: bool };
        }
    }
};

Page.level7 = function () {
    // central mass
    var bool = false;
    var arr = [[5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
			[4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
			[3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
			[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3], [11, 3],
			[4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4],
			[5, 5], [6, 5], [7, 5], [8, 5], [9, 5],
			[3, 7],
			[2, 8], [3, 8], [4, 8],
			[3, 9],
			[11, 7],
			[10, 8], [11, 8], [12, 8],
			[11, 9]];

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: true };
        }
    }

    for (var i = 0; i < arr.length; i++) {
        var b = arr[i];
        Page.bricks[b[0]][b[1]] = { x: 0, y: 0, destroyed: false };
    }
};

Page.level8 = function () {
    // split screen
    var bool = false;
    Page.brickRowCount = 7;
    Page.isOverlaying = true;
    Page.$overlayCanvas.css('display', 'block');

    for (var i = 0; i < Page.brickColumnCount; i++) {
        Page.bricks[i] = [];
        for (var j = 0; j < Page.brickRowCount; j++) {
            bool = !((j - i < -7) || (j + i < Page.brickRowCount));
            Page.bricks[i][j] = { x: 0, y: 0, destroyed: bool };
        }
    }
};

//#endregion Levels

//#region Reset / Replay

Page.gameOver = function () {
    Page.isGameOver = true;
    Page.stop();
    Page.drawCenteredText('GAME OVER');
    Page.gameOverModal();
};

Page.gameOverModal = function () {
    $('#game-over-modal').on('show.bs.modal', function (e) {
        $(this).find('#confirm-replay-game').on('click', function () {
            Page.resetGame();
            $('#game-over-modal').modal('hide');
        });
    });

    $('#game-over-modal').modal('show');
};

Page.resetGame = function () {
    Page.level = 0;
    Page.lives = 2;
    Page.score = 0;

    Page.setupNextLevel();
};

//#endregion Reset / Replay

$(document).on('ready', function () {
    Page.initialize();
});
