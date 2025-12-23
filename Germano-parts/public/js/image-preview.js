
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');

imageInput.addEventListener('change', function() {
const file = this.files[0];

if (file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
    }

    // Lê o arquivo de imagem como uma URL de dados.
    reader.readAsDataURL(file);
}
});
