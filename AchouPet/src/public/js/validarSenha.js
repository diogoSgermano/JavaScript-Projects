// Aguarda o carregamento completo do DOM para garantir que todos os elementos HTML estejam disponíveis.

//validar senha criar !
document.addEventListener('DOMContentLoaded', function() {
  // Seleciona os elementos do formulário necessários para a validação.
  const form = document.querySelector('form');
  const senhaInput = document.getElementById('senha');
  const senhaRepetirInput = document.getElementById('senhaRepetir');
  const errorContainer = document.getElementById('error-container');

  /**
   * Função que lida com a submissão do formulário.
   * @param {Event} event - O evento de submissão.
   */
  function handleFormSubmit(event) {
    errorContainer.textContent = ''; // Limpa mensagens de erro anteriores.

    // Validação: verifica se as senhas digitadas são diferentes.
    if (senhaInput.value !== senhaRepetirInput.value) {
      event.preventDefault(); // Impede o envio do formulário se as senhas não baterem.
      errorContainer.textContent = 'As senhas não são iguais. Tente novamente.'; // Exibe uma mensagem de erro.
    }
  }

  /**
   * Função que limpa a mensagem de erro quando o usuário começa a digitar.
   */
  function clearErrorOnChange() {
    errorContainer.textContent = '';
  }

  form.addEventListener('submit', handleFormSubmit);
  senhaInput.addEventListener('input', clearErrorOnChange);
  senhaRepetirInput.addEventListener('input', clearErrorOnChange);
});

//validar senha entrar
document.addEventListener('DOMContentLoaded', function() {
  const formulario = document.getElementById('formEntrar');
  const emailEntrarInput = document.getElementById('email');
  const senhaEntrarInput = document.getElementById('password');
  const erroContainer = document.getElementById('erro-container');

  if (!formulario) return;

  formulario.addEventListener('submit', async function(event) {
    event.preventDefault(); // impede envio padrão

    erroContainer.textContent = '';

    const emailEntrar = emailEntrarInput.value.trim();
    const senhaEntrar = senhaEntrarInput.value.trim();

    if (!emailEntrar || !senhaEntrar) {
      erroContainer.textContent = 'Preencha todos os campos.';
      return;
    }

    try {
      const resposta = await fetch('/login/verificarUsuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailEntrar, senhaEntrar })
      });

      const resultado = await resposta.json();

      if (!resultado.success) {
        erroContainer.textContent = resultado.message;
        return;
      }

      // Login válido -> redireciona
      window.location.href = '/animais';
    } catch (error) {
      console.error('Erro na validação:', error);
      erroContainer.textContent = 'Erro ao validar login. Tente novamente.';
    }
  });
});
