from PIL import Image
import matplotlib.pyplot as plt


image_path = "samples/sample1.jpg"

# LOAD IMAGE
image = Image.open(image_path)

# CONVERT TO GRAYSCALE
gray_image = image.convert("L")

# RESIZE TO 28x28
resized_image = gray_image.resize((28, 28))


# SAVE IMAGE
output_path = "28x28/converted_image.png"
resized_image.save(output_path)
print("Image converted successfully!")

# ==========================================
# DISPLAY IMAGE
plt.figure(figsize=(4,4))
plt.imshow(resized_image, cmap='gray')
plt.title("28x28 Grayscale Image")
plt.axis("off")
plt.show()