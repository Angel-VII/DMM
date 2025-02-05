document.addEventListener('DOMContentLoaded', () => {
    let colors = [];
    let selectedColor = null; // Track selected color
    let colorCodeIndex = 0; // Track color code index
    const circleRadius = 12; // Radio de los círculos
    const gridSize = circleRadius * 2; // Tamaño de la cuadrícula
    const circles = []; // Lista de círculos dibujados
    let isDrawing = false; // Track if the mouse is being pressed

    // Load the CSV file
    fetch('data.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1);
            colors = rows.map(row => {
                const [Floss, Description, Red, Green, Blue, RGBCode] = row.split(',').map(value => value.trim());
                return { Floss, Description, Red, Green, Blue, RGBCode, Quantity: 0, Count: 0 };
            });
            updateNoColorsMessage(); // Mostrar el mensaje al cargar la página si no hay colores
        })
        .catch(error => console.error('Error loading CSV:', error));

    const generateColorCode = () => {
        const codes = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const code = codes[colorCodeIndex % codes.length];
        colorCodeIndex++;
        return code;
    };

    const getContrastColor = (hexColor) => {
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        const yiq = (r * 299 + g * 587 + b * 114) / 1000;
        return yiq >= 128 ? 'black' : 'white';
    };

    const updateColorCount = (floss, increment) => {
        const color = colors.find(c => c.Floss === floss);
        if (color) {
            color.Count += increment;
            const colorItem = document.querySelector(`.color-item[data-floss="${floss}"]`);
            if (colorItem) {
                const countSpan = colorItem.querySelector('.count');
                countSpan.innerHTML = `<i class="fas fa-gem"></i> ${color.Count}`;
            }
        }
    };

    const removeColorFromCanvas = (floss) => {
        const newCircles = circles.filter(circle => circle.floss !== floss);
        circles.length = 0;
        circles.push(...newCircles);
        redrawCanvas();
    };

    const redrawCanvas = () => {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        circles.forEach(circle => {
            ctx.fillStyle = `#${circle.color}`;
            ctx.beginPath();
            ctx.arc(circle.x, circle.y, circleRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = getContrastColor(circle.color);
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(circle.code, circle.x, circle.y);
        });
    };

    const updateNoColorsMessage = () => {
        const selectableColorList = document.getElementById('selectableColorList');
        const noColorsMessage = document.getElementById('noColorsMessage');
        if (selectableColorList.children.length === 0) {
            noColorsMessage.style.display = 'block';
        } else {
            noColorsMessage.style.display = 'none';
        }
    };

    window.addColor = () => {
        const flossInput = document.getElementById('flossInput').value.trim();
        const color = colors.find(c => c.Floss === flossInput);

        if (!color) {
            alert('Floss# not found');
            return;
        }

        const selectableColorList = document.getElementById('selectableColorList');
        const existingItem = selectableColorList.querySelector(`.color-item[data-floss="${flossInput}"]`);
        if (existingItem) {
            alert('Floss# already added');
            return;
        }

        const colorCode = generateColorCode();
        const selectableColorItem = document.createElement('div');
        selectableColorItem.className = 'color-item';
        selectableColorItem.setAttribute('data-floss', flossInput);
        selectableColorItem.innerHTML = `
            <button style="background-color: #${color.RGBCode}; color: ${getContrastColor(color.RGBCode)};" class="color-code">${colorCode}</button>
            <span class="color-description">${color.Floss}</span>
            <span class="count"><i class="fas fa-gem"></i> 0</span>
            <button class="remove-btn" title="Remove"><i class="fas fa-times"></i></button>
        `;
        selectableColorItem.querySelector('.color-code').onclick = () => {
            selectedColor = { ...color, code: colorCode };
            document.querySelectorAll('.color-item').forEach(item => item.classList.remove('selected'));
            selectableColorItem.classList.add('selected');
        };
        selectableColorItem.querySelector('.remove-btn').onclick = () => {
            selectableColorList.removeChild(selectableColorItem);
            removeColorFromCanvas(flossInput);
            selectedColor = null; // Desactivar el color seleccionado
            updateNoColorsMessage();
        };
        selectableColorList.appendChild(selectableColorItem);
        updateNoColorsMessage();

        // Limpiar el input después de agregar el color
        document.getElementById('flossInput').value = '';
    };

    document.getElementById('flossInput').addEventListener('input', (e) => {
        const input = e.target.value.trim();
        const suggestions = document.getElementById('suggestions');
        suggestions.innerHTML = '';

        if (input) {
            colors.filter(c => c.Floss.startsWith(input)).forEach(color => {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion';
                suggestion.textContent = `${color.Floss} - ${color.Description}`;
                suggestion.onclick = () => {
                    document.getElementById('flossInput').value = color.Floss;
                    suggestions.innerHTML = '';
                };
                suggestions.appendChild(suggestion);
            });
        }
    });

    // Pintar en el canvas
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // Dibujar la cuadrícula
    const drawGrid = () => {
        ctx.strokeStyle = '#ddd';
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    };

    drawGrid();

    const drawCircle = (x, y) => {
        if (!selectedColor) {
            alert('Please select a color first');
            return;
        }

        // Ajustar la posición del círculo a la cuadrícula más cercana
        x = Math.floor(x / gridSize) * gridSize + circleRadius;
        y = Math.floor(y / gridSize) * gridSize + circleRadius;

        // Verificar si el círculo se sobrepone con otros círculos y eliminar el círculo anterior si existe
        const existingCircleIndex = circles.findIndex(circle => circle.x === x && circle.y === y);
        if (existingCircleIndex !== -1) {
            const existingCircle = circles[existingCircleIndex];
            updateColorCount(existingCircle.floss, -1);
            circles.splice(existingCircleIndex, 1);
            // Borrar el círculo anterior
            ctx.clearRect(x - circleRadius, y - circleRadius, gridSize, gridSize);
            drawGrid();
            // Redibujar los círculos restantes
            circles.forEach(circle => {
                ctx.fillStyle = `#${circle.color}`;
                ctx.beginPath();
                ctx.arc(circle.x, circle.y, circleRadius, 0, 2 * Math.PI);
                ctx.fill();
                ctx.fillStyle = getContrastColor(circle.color);
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(circle.code, circle.x, circle.y);
            });
        }

        // Dibujar el círculo en la posición ajustada
        ctx.fillStyle = `#${selectedColor.RGBCode}`;
        ctx.beginPath();
        ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
        ctx.fill();

        // Dibujar el código de identificación con el color de contraste adecuado
        ctx.fillStyle = getContrastColor(selectedColor.RGBCode);
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(selectedColor.code, x, y);

        // Agregar el círculo a la lista de círculos
        circles.push({ x, y, color: selectedColor.RGBCode, code: selectedColor.code, floss: selectedColor.Floss });
        updateColorCount(selectedColor.Floss, 1);
    };

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        drawCircle(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            drawCircle(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    window.resizeCanvas = (width, height) => {
        const canvas = document.getElementById('canvas');
        canvas.width = width;
        canvas.height = height;
        redrawCanvas();
    };

    window.saveAsPDF = () => {
        const canvas = document.getElementById('canvas');
        const colorList = document.getElementById('selectableColorList');
        const colorListClone = colorList.cloneNode(true);
        const colorListItems = colorListClone.querySelectorAll('.color-item');
        
        // Crear un documento PDF con tamaño A4 y márgenes
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'cm',
            format: 'a4'
        });
        const margin = 1.5; // Margen de 1.5 cm

        // Calcular el tamaño del canvas en el PDF
        let canvasSize;
        if (canvas.width === 600) {
            canvasSize = 5;
        } else if (canvas.width === 1200) {
            canvasSize = 10;
        } else if (canvas.width === 1800) {
            canvasSize = 15;
        }

        // Dibujar la cuadrícula en el PDF
        pdf.setLineWidth(0.01);
        pdf.setDrawColor(221, 221, 221);
        for (let x = 0; x <= canvas.width; x += gridSize) {
            pdf.line(margin + x / (canvas.width / canvasSize), margin, margin + x / (canvas.width / canvasSize), margin + canvasSize);
        }
        for (let y = 0; y <= canvas.height; y += gridSize) {
            pdf.line(margin, margin + y / (canvas.height / canvasSize), margin + canvasSize, margin + y / (canvas.height / canvasSize));
        }

        // Dibujar los círculos en el PDF
        circles.forEach(circle => {
            pdf.setFillColor(circle.color);
            pdf.circle(margin + circle.x / (canvas.width / canvasSize), margin + circle.y / (canvas.height / canvasSize), circleRadius / (canvas.width / canvasSize), 'F');
            pdf.setTextColor(getContrastColor(circle.color));
            pdf.setFontSize(5); // Ajustar el tamaño de la fuente
            pdf.text(circle.code, margin + circle.x / (canvas.width / canvasSize), margin + circle.y / (canvas.height / canvasSize), { align: 'center', baseline: 'middle' });
        });

        // Dibujar la lista de colores en el PDF a partir de la segunda página
        pdf.addPage();
        let y = margin;
        colorListItems.forEach((item, index) => {
            if (y > pdf.internal.pageSize.height - margin) {
                pdf.addPage();
                y = margin;
            }
            const colorCode = item.querySelector('.color-code').textContent.trim();
            const floss = item.querySelector('.color-description').textContent.trim();
            const count = item.querySelector('.count').textContent.trim();
            const color = item.querySelector('.color-code').style.backgroundColor;
            pdf.setFillColor(color);
            pdf.circle(margin, y + 1, 0.4, 'F');
            pdf.setTextColor(getContrastColor(color.replace('#', '')));
            pdf.setFontSize(8); // Ajustar el tamaño de la fuente
            pdf.text(colorCode, margin, y + 1, { align: 'center', baseline: 'middle' }); // Mostrar el código dentro del círculo
            pdf.setTextColor('#000');
            pdf.text(`Cod: ${floss}`, margin + 2, y + 1.25);
            pdf.text(`\u25A0 ${count}`, margin + 4, y + 1.25); // Icono monocromo
            y += 2;
        });

        // Guardar el PDF
        pdf.save('canvas_with_colors.pdf');
    };
});
