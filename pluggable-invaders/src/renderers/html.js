// Should probably think about combining the images into a single sprite sheet at some point....
const sprites = {
  alienExplode: './assets/alien-explode.png',
  invaderA1: './assets/invader-a-1.png',
  invaderA2: './assets/invader-a-2.png',
  invaderB1: './assets/invader-b-1.png',
  invaderB2: './assets/invader-b-2.png',
  invaderC1: './assets/invader-c-1.png',
  invaderC2: './assets/invader-c-2.png',
  invaderShotExplode: './assets/invader-shot-explode.png',
  playerExplode1: './assets/player-explode-1.png',
  playerExplode2: './assets/player-explode-2.png',
  playerShotExplode: './assets/player-shot-explode.png',
  playerShot: './assets/player-shot.png',
  player: './assets/player.png',
  plungerShot1: './assets/plunger-shot-1.png',
  plungerShot2: './assets/plunger-shot-2.png',
  plungerShot3: './assets/plunger-shot-3.png',
  plungerShot4: './assets/plunger-shot-4.png',
  rollingShot1: './assets/rolling-shot-1.png',
  rollingShot2: './assets/rolling-shot-1.png',
  rollingShot3: './assets/rolling-shot-1.png',
  rollingShot4: './assets/rolling-shot-1.png',
  saucerExplode: './assets/saucer-explode.png',
  saucer: './assets/saucer.png',
  shield: './assets/shield.png',
  squigglyShot1: './assets/squiggly-shot-1.png',
  squigglyShot2: './assets/squiggly-shot-2.png',
  squigglyShot3: './assets/squiggly-shot-3.png',
};

// Load the sprites
const spriteImages = new Map();
Object.entries(sprites).map(([sprite, asset]) => {
  const img = new Image();
  img.onload = async () => {
    spriteImages.set(sprite, await createImageBitmap(img, 0, 0, img.width, img.height));
  };
  img.src = asset;
});

class HtmlRenderer {
  #gamearea;
  #oldSprites = new Map();

  initialise() {
    this.#gamearea = document.getElementById('gamearea').getContext('2d', { willReadFrequently: true });
  }

  #clearSprite(id) {
    if (this.#oldSprites.has(id)) {
      const {name, x, y} = this.#oldSprites.get(id);
      const sprite = spriteImages.get(name);
      this.#gamearea.clearRect(x, y, sprite.width, sprite.height);
      this.#oldSprites.delete(id);
    }
  }

  static normalizeSRGB(srgb) {
    // Remove the alpha values
    return srgb.filter((_, index) => (index + 1) % 4);
  }

  #drawSprite(name, x, y, id = name ) {
    const sprite = spriteImages.get(name);
    // Get the contents of the screen where we are about to draw the sprite
    const currentState = HtmlRenderer.normalizeSRGB(this.#gamearea.getImageData(x, y, sprite.width, sprite.height).data);
    this.#clearSprite(id);
    this.#gamearea.globalCompositingOperation = 'source-over';
    this.#gamearea.drawImage(sprite, x, y);
    // Get the contents of the screen after drawing the sprite
    const newState = HtmlRenderer.normalizeSRGB(this.#gamearea.getImageData(x, y, sprite.width, sprite.height).data);
    this.#oldSprites.set(id, {name, x, y});

    // Compare the pixels, if there are more set than our sprite contains then we have a collision
    const collision = currentState.map((current, index) => current && newState[index]).find((value) => value > 0);
    return collision;
  }

  renderSaucer({ saucerX }) {
    if (saucerX >= 0) {
      this.#drawSprite('saucer', saucerX, 40);
    }
  }

  renderInvader({ invader, animationStep }) {
    const { x, y, type, dead, hit, id } = invader;

    if (dead) {
      this.#clearSprite(id);
    } else {
      let invaderSprite;
      switch (type) {
      case 0:
      case 1:
        invaderSprite = 'invaderA';
        break;
      case 2:
      case 3:
        invaderSprite = 'invaderB';
        break;
      case 4:
        invaderSprite = 'invaderC';
        break;
      }

      invaderSprite = `${invaderSprite}${animationStep ? 1 : 2}`;
      this.#drawSprite(hit ? 'alienExplode' : invaderSprite, x, y, id);
    }
  }

  renderBases() {    
    for (let i = 0; i < 4; i++) {
      this.#drawSprite('shield', 32 + (i * 45), 192, `shield-${i}`);
    }
  }

  renderPlayer({ playerX }) {
    this.#drawSprite('player', playerX, 216);
  }

  renderPlayerShot({ playerShotX, playerShotY, playerShotFired }) {
    if (playerShotFired) {
      return this.#drawSprite('playerShot', playerShotX, playerShotY);
    } else {
      this.#clearSprite('playerShot');
    }
  }
}

window.registerRenderer(new HtmlRenderer());