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

class InvadersState {
  score = 0;
  level = 1;
  currentInvader = -1;
  referenceX = startX;
  referenceY = startY;
  invaders = [];
  direction = 1;
  willAdvance = false;
  startAdvance = false;
  advancing = false;
  hadFullInvadersCycle = false;
  triggerInvaded = false;
  invaded = false;
  allDead = false;
  animateStep = true;
  saucerX = 8; // undefined = no saucer visible
  playerX = 8;
  leftDown = false;
  rightDown = false;
  moveDirection = 0;

  incrementCurrentInvader() {
    let newCurrentInvader = this.currentInvader + 1;

    if (newCurrentInvader === 55) {
      // Reset to the reference invader
      newCurrentInvader = 0;

      // We've now processed all the invaders, so if they are meant to be advancing to
      // the next row - start!
      this.startAdvance = this.willAdvance;
      this.willAdvance = false;
      this.advancing = false;

      // Switch the animation each time a cycle completes
      this.animateStep = !this.animateStep;

      // Processed all the invaders so if any have 'invaded' then time for the player to die
      this.invaded = this.triggerInvaded;
    }

    this.currentInvader = newCurrentInvader;

    return this.invaders[this.currentInvader];
  }

  initialiseInvaders() {
    this.currentInvader = this.currentInvader + 1;

    // Initialising - no movement
    this.invaders.push({
      id: this.invaders.length,
      type: Math.floor(this.currentInvader / 11),
      x: this.referenceX + ((this.currentInvader % 11) * (invaderWidth + invaderXGap)),
      y: this.referenceY - ((Math.floor(this.currentInvader / 11)) * (invaderHeight + invaderYGap)),
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
      return;
    }

    // Find the first non-dead invader
    while (this.incrementCurrentInvader().dead) { /* empty */ }

    if (this.invaded) {
      return;
    }

    if (this.startAdvance) {
      this.direction = this.direction * -1;
      this.referenceY += invaderYIncrement;
      this.startAdvance = false;
      this.advancing = true;
    }

    const newY = this.referenceY - ((Math.floor(this.currentInvader / 11)) * (invaderHeight + invaderYGap));
    this.triggerInvaded |= newY === 216;
    this.invaders[this.currentInvader].y = newY;

    // Only increment the X invader position if they aren't advancing (moving 1 row down the screen)
    if (!this.advancing) {
      this.invaders[this.currentInvader].x += (invaderXIncrement * this.direction);

      if (this.invaders[this.currentInvader].x <= 8 || this.invaders[this.currentInvader].x >= 200) {
        // Once we've updated all the invaders in a cycle, trigger an advance
        this.willAdvance = true;
      }
    }
  }
}

class PlayerState {
  playerShotFired = false;
  playerShotY = startY;
  playerShotX = startX;
  // skipframes = 0;
  // playerShotFrame = 1;

  updateplayerShot() {
    if (this.playerShotFired) {
      // See https://www.computerarcheology.com/Arcade/SpaceInvaders/#game-object-1-movedraw-players-shot
      this.playerShotY -= 4;
      if (this.playerShotY < 0) {
        this.playerShotFired = false;
      }

      // this.skipframes++;
      // if (this.skipframes == 10) {
      //   this.playerShotFrame++;
      //   this.playerShotFrame = (this.playerShotFrame % 3) + 1;
      //   this.skipframes = 0;
      // }
    }
  }
}

class Game {
  running = false;
  renderers;
  invadersState;
  playerState;

  constructor(renderers) {
    this.renderers = renderers;
  }

  updatePlayer() {
    const newPosition = this.invadersState.playerX + this.moveDirection;
    if (newPosition >= 8 && newPosition <=200) {
      this.invadersState.playerX = newPosition;
    }
  }

  mainLoop() {
    if (this.running && !this.invadersState.invaded && !this.invadersState.allDead) {
      let deadInvader;

      if (this.invadersState.invaders.length < 55) {
        this.invadersState.initialiseInvaders();
      } else {
        // TBD
        // Need to add an initial delay before the player is drawn - not sure what this is, it feels like 2 seconds from
        // watching play on youtube but need to look at the original code to figure out what it really is
        this.updatePlayer();
        this.invadersState.updateInvaders();
        this.playerState.updateplayerShot();
        // For now - randomly simulate invaders being shot
        if (Math.random() > 0.85) {
          deadInvader = Math.floor(Math.random() * 55);
          this.invadersState.invaders[deadInvader].dead = true;
          this.invadersState.allDead = this.invadersState.invaders.find((invader) => !invader.dead) === undefined;
        }
      }

      this.renderers.forEach((renderer) => {
        if (deadInvader >= 0) {
          renderer.renderInvader({ invader: this.invadersState.invaders[deadInvader] });
        }
        renderer.renderBases(this.invadersState);
        renderer.renderSaucer({ saucerX: this.invadersState.saucerX });
        renderer.renderInvader({ invader: this.invadersState.invaders[this.invadersState.currentInvader], animationStep: this.invadersState.animateStep });
        renderer.renderPlayer({ playerX: this.invadersState.playerX });
        if (renderer.renderPlayerShot({
          playerShotX: this.playerState.playerShotX,
          playerShotY: this.playerState.playerShotY,
          playerShotFrame: this.playerState.playerShotFrame,
          playerShotFired: this.playerState.playerShotFired
        })) {
          console.log('Player shot hit something!');
          this.playerState.playerShotFired = false;
        }
      });
    }
    this.raf = window.requestAnimationFrame(this.mainLoop.bind(this));
  }

  start() {
    if (this.raf) {
      window.cancelAnimationFrame(this.raf);
    }
    this.invadersState = new InvadersState();
    this.playerState = new PlayerState();
    this.renderers.forEach((renderer) => {
      renderer.initialise(this.invadersState);
      renderer.initialise(this.playerState);
    });
    this.running = true;
    this.raf = window.requestAnimationFrame(this.mainLoop.bind(this));
  }

  pause() {
    this.running = false;
  }

  resume() {
    this.running = true;
  }

  playerLeft(down) {
    this.leftDown = down;
    this.moveDirection = 0;
    if (down) {
      this.moveDirection = -1;
    } else if (this.rightDown) {
      this.moveDirection = 1;
    }
  }

  playerRight(down) {
    this.rightDown = down;
    this.moveDirection = 0;
    if (down) {
      this.moveDirection = 1;
    } else if (this.leftDown) {
      this.moveDirection = -1;
    }
  }

  playerFire() {
    if (!this.playerState.playerShotFired) {
      this.playerState.playerShotFired = true;
      this.playerState.playerShotY = 216;
      this.playerState.playerShotX = this.invadersState.playerX + 8;
    }
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
    game.playerLeft(true);
    break;
  case 'ArrowRight':
    game.playerRight(true);
    break;
  case 'ArrowUp':
    game.playerFire();
    break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.key) {
  case 'ArrowLeft':
    game.playerLeft(false);
    break;
  case 'ArrowRight':
    game.playerRight(false);
    break;
  }
});
