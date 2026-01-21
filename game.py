
print("Welcome to my first Python game!")

score = 0

while True:
    choice = input("Type 'play' to score a point or 'quit' to exit: ").lower()

    if choice == "play":
        score += 1
        print(f"Score: {score}")
    elif choice == "quit":
        print("Thanks for playing!")
        break
    else:
        print("Invalid choice.")
