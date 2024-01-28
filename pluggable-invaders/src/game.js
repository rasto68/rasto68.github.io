const renderers = [];

// Initial coordinates of the 'reference' invader, all other invaders are drawn from this
// reference point
const startX = 12;
const startY = 128; // This increases as levels progress - TBD (152, 168, 176, 184)
const invaderWidth = 12;
const invaderHeight = 8;
// Gap in pixels between the invaders
const invaderXGap = 4;
const invaderYGap = 8;
// How many pixels the invader moves each screen refresh (60fps)
// This increases to 3 going left to right when only 1 invader is left!
const invaderXIncrement = 2;
// How many pixels down the invader moves when the play area edge is reached
const invaderYIncrement = 8;

class Invaders {
  #currentInvaderIndex = -1;
  #referenceX = startX;
  #referenceY = startY;
  #direction = 1;
  #willAdvance = false;
  #startAdvance = false;
  #advancing = false;
  #triggerInvaded = false;
  #animateStep = true;
  #saucerX = 8; // undefined = no saucer visible
  invaders = [];
  invaded = false;
  allDead = false;

  incrementCurrentInvader() {
    let newCurrentInvaderIndex = this.#currentInvaderIndex + 1;

    if (newCurrentInvaderIndex === 55) {
      // Reset to the reference invader
      newCurrentInvaderIndex = 0;

      // We've now processed all the invaders, so if they are meant to be advancing to
      // the next row - start!
      this.#startAdvance = this.#willAdvance;
      this.#willAdvance = false;
      this.#advancing = false;

      // Switch the animation each time a cycle completes
      this.#animateStep = !this.#animateStep;

      // Processed all the invaders so if any have 'invaded' then time for the player to die
      this.invaded = this.#triggerInvaded;
    }

    this.#currentInvaderIndex = newCurrentInvaderIndex;

    return this.invaders[this.#currentInvaderIndex];
  }

  initialiseInvaders() {
    this.#currentInvaderIndex = this.#currentInvaderIndex + 1;

    // Initialising - no movement
    this.invaders.push({
      id: this.invaders.length,
      type: Math.floor(this.#currentInvaderIndex / 11),
      x: this.#referenceX + ((this.#currentInvaderIndex % 11) * (invaderWidth + invaderXGap)),
      y: this.#referenceY - ((Math.floor(this.#currentInvaderIndex / 11)) * (invaderHeight + invaderYGap)),
      dead: false,
    });
  }

  updateInvaders() {
    let liveInvaders = 0;
    this.invaders.forEach((invader) => {
      if (!invader.dead) {
        liveInvaders++;
      }
    });

    if (liveInvaders === 0) {
      this.allDead = true;
      return;
    }

    // Find the first non-dead invader
    while (this.incrementCurrentInvader().dead) { /* empty */ }

    if (this.invaded) {
      return;
    }

    if (this.#startAdvance) {
      this.#direction = this.#direction * -1;
      this.#referenceY += invaderYIncrement;
      this.#startAdvance = false;
      this.#advancing = true;
    }

    const newY = this.#referenceY - ((Math.floor(this.#currentInvaderIndex / 11)) * (invaderHeight + invaderYGap));
    this.#triggerInvaded |= newY === 216;
    this.invaders[this.#currentInvaderIndex].y = newY;

    // Only increment the X invader position if they aren't advancing (moving 1 row down the screen)
    if (!this.#advancing) {
      this.invaders[this.#currentInvaderIndex].x += (invaderXIncrement * this.#direction);

      if (this.invaders[this.#currentInvaderIndex].x <= 8 || this.invaders[this.#currentInvaderIndex].x >= 200) {
        // Once we've updated all the invaders in a cycle, trigger an advance
        this.#willAdvance = true;
      }
    }
  }

  render(renderer) {
    renderer.renderSaucer({ saucerX: this.#saucerX });
    renderer.renderInvader({ invader: this.invaders[this.#currentInvaderIndex], animationStep: this.#animateStep });
  }
}

class Player {
  #score = 0;
  #level = 1;
  #playerShotFired = false;
  #playerShotX;
  #playerShotY;
  #playerX = 8;
  #leftDown = false;
  #rightDown = false;
  #moveDirection = 0;

  updatePlayer() {
    const newPosition = this.#playerX + this.#moveDirection;
    if (newPosition >= 8 && newPosition <=200) {
      this.#playerX = newPosition;
    }
  }

  updateplayerShot() {
    if (this.#playerShotFired) {
      // See https://www.computerarcheology.com/Arcade/SpaceInvaders/#game-object-1-movedraw-players-shot
      this.#playerShotY -= 4;
      if (this.#playerShotY < 0) {
        this.#playerShotFired = false;
      }
    }
  }

  moveLeft(down) {
    this.#leftDown = down;
    this.#moveDirection = 0;
    if (down) {
      this.#moveDirection = -1;
    } else if (this.#rightDown) {
      this.#moveDirection = 1;
    }
  }

  moveRight(down) {
    this.#rightDown = down;
    this.#moveDirection = 0;
    if (down) {
      this.#moveDirection = 1;
    } else if (this.#leftDown) {
      this.#moveDirection = -1;
    }
  }

  fire() {
    if (!this.#playerShotFired) {
      this.#playerShotFired = true;
      this.#playerShotY = 216;
      this.#playerShotX = this.#playerX + 8;
    }
  }

  render(renderer) {
    renderer.renderPlayer({ playerX: this.#playerX });
  }

  renderShot(renderer) {
    if (renderer.renderPlayerShot({
      playerShotX: this.#playerShotX,
      playerShotY: this.#playerShotY,
      playerShotFired: this.#playerShotFired
    })) {
      this.#playerShotFired = false;
      return { hitx: this.#playerShotX, hity: this.#playerShotY };
    }

    return;
  }
}

class Game {
  #running = false;
  #renderers;
  #invaders;
  #interval = 1000 / 60;
  #lastFrame = 0;
  #delta = 0;
  #hitInvader;
  #addedBases;
  player;

  constructor(renderers) {
    this.#renderers = renderers;
  }

  mainLoop() {
    const now = performance.now();
    const run = now - this.#lastFrame >= this.#interval - this.#delta;
    if (run && this.#running && !this.#invaders.invaded && !this.#invaders.allDead) {      
      this.#lastFrame = now;
      this.delta = Math.min(this.#interval, this.#delta + now - this.#lastFrame - this.#interval);

      if (this.#invaders.invaders.length < 55) {
        this.#invaders.initialiseInvaders();
      } else {
        // TBD
        // Need to add an initial delay before the player is drawn - not sure what this is, it feels like 2 seconds from
        // watching play on youtube but need to look at the original code to figure out what it really is
        this.player.updatePlayer();
        this.#invaders.updateInvaders();
        this.player.updateplayerShot();
      }

      this.#renderers.forEach((renderer) => {
        if (!this.#addedBases) {
          renderer.renderBases(this.#invaders);
          this.#addedBases = true;
        }

        this.#invaders.render(renderer);

        this.player.render(renderer);

        const hit = this.player.renderShot(renderer);
        if (hit) {
          const { hitx, hity } = hit;
          this.#hitInvader = this.#invaders.invaders.find((invader) => {
            const left = invader.x;
            const right = invader.x + 16;
            const top = invader.y;
            const bottom = invader.y + 8;
            return !invader.dead && hitx >= left && hitx < right && hity >= top && hity < bottom;
          });
          if (this.#hitInvader) {
            this.#hitInvader.dead = true;
            renderer.renderInvader({ invader: this.#hitInvader, animationStep: this.#invaders.animateStep });
          }
        }

        renderer.renderOverlay();
      });
    }
    this.raf = window.requestAnimationFrame(this.mainLoop.bind(this));
  }

  start() {
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
    }
    this.#invaders = new Invaders();
    this.player = new Player();
    this.#renderers.forEach((renderer) => {
      renderer.initialise(this.#invaders);
      renderer.initialise(this.player);
    });
    this.#running = true;
    this.mainLoop();
  }

  pause() {
    this.#running = false;
  }

  resume() {
    this.#running = true;
  }
}

window.registerRenderer = (renderer) => {
  renderers.push(renderer);
};

const game = new Game(renderers);
document.getElementById('start').addEventListener('click', () => {
  game.start();
});
document.getElementById('pause').addEventListener('click', () => {
  game.pause();
});
document.getElementById('resume').addEventListener('click', () => {
  game.resume();
});

window.addEventListener('keydown', (e) => {
  switch (e.key) {
  case 'ArrowLeft':
    game.player.moveLeft(true);
    break;
  case 'ArrowRight':
    game.player.moveRight(true);
    break;
  case 'ArrowUp':
    game.player.fire();
    break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.key) {
  case 'ArrowLeft':
    game.player.moveLeft(false);
    break;
  case 'ArrowRight':
    game.player.moveRight(false);
    break;
  }
});
