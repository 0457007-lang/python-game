
# game.pby — Pygame Zero "Catch the Coin"
# Run (on a computer with Python + Pygame Zero installed):
#   pgzrun game.py
# or:
#   python -m pgzero game.py

import random

WIDTH = 600
HEIGHT = 400

# Actors (sprites must be in images/ as player.png and coin.png)
player = Actor('player')
player.pos = (WIDTH // 2, HEIGHT - 40)

coin = Actor('coin')
coin.pos = (random.randint(20, WIDTH - 20), -20)

coin_speed = 3
score = 0
lives = 3
game_over = False

def draw():
    screen.clear()
    screen.fill((25, 25, 35))  # dark background
    player.draw()
    coin.draw()
    screen.draw.text(f"Score: {score}", (10, 10), color="white", fontsize=36)
    screen.draw.text(f"Lives: {lives}", (10, 50), color="orange", fontsize=28)

    if game_over:
        screen.draw.text("Game Over! Press ENTER to restart",
                         center=(WIDTH // 2, HEIGHT // 2),
                         color="yellow", fontsize=40)

def update():
    global score, lives, coin_speed, game_over
    if game_over:
        return

    # Move player with arrows (A/D also work)
    if keyboard.left or keyboard.a:
        player.x = max(20, player.x - 6)
    if keyboard.right or keyboard.d:
        player.x = min(WIDTH - 20, player.x + 6)

    # Drop the coin
    coin.y += coin_speed

    # Missed coin → lose a life and reset
    if coin.y > HEIGHT + 20:
        lives -= 1
        reset_coin()

    # Caught coin → score up and speed up a bit
    if player.colliderect(coin):
        score += 1
        coin_speed = min(12, coin_speed + 0.25)
        reset_coin()

    # Out of lives → game over
    if lives <= 0:
        game_over = True

def on_key_down(key):
    """Restart if game over and ENTER is pressed."""
    global score, lives, coin_speed, game_over
    if game_over and key == keys.RETURN:
        score = 0
        lives = 3
        coin_speed = 3
        reset_coin()
        game_over = False

def reset_coin():
    coin.x = random.randint(20, WIDTH - 20)
    coin.y = -20
