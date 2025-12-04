from PIL import Image, ImageDraw
import os

sizes = [16, 32, 48, 128]

for size in sizes:
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    padding = 0
    radius = size // 5
    draw.rounded_rectangle(
        [padding, padding, size - padding - 1, size - padding - 1],
        radius=radius,
        fill=(10, 10, 10, 255)
    )
    
    # Draw the wingman logo (simplified - a diamond/layers shape)
    center = size // 2
    margin = size // 6
    color = (14, 165, 233, 255)  # Sky blue (#0ea5e9)
    
    # Top triangle (filled)
    top_points = [
        (center, margin),
        (margin, center - margin // 2),
        (center, center),
        (size - margin, center - margin // 2)
    ]
    draw.polygon(top_points, fill=color)
    
    # Middle line
    line_width = max(1, size // 12)
    draw.line([(margin, center + margin // 3), (center, center + margin), (size - margin, center + margin // 3)], 
              fill=color, width=line_width)
    
    # Bottom line
    draw.line([(margin, size - margin - margin // 3), (center, size - margin), (size - margin, size - margin - margin // 3)], 
              fill=color, width=line_width)
    
    # Save
    filename = f'icon{size}.png'
    img.save(filename)
    print(f'Created {filename}')

print('All icons created!')
