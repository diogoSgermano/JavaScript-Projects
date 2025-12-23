document.addEventListener('DOMContentLoaded', () => {
  // Event delegation for reply buttons
  document.body.addEventListener('click', function (e) {
    const replyBtn = e.target.closest('.reply-btn');
    if (replyBtn) {
      const commentId = replyBtn.dataset.commentId;
      const commentCard = replyBtn.closest('.comment-card');
      // If a reply form already exists under this comment, toggle it
      let existing = commentCard.querySelector('.reply-form');
      if (existing) {
        existing.remove();
        return;
      }

      // Create reply form element
      const form = document.createElement('form');
      form.className = 'reply-form';
      form.style.marginTop = '12px';
      form.innerHTML = `
        <div class="mb-3">
          <textarea class="form-control reply-text" rows="3" placeholder="Escreva sua resposta aqui..." style="border-radius: 12px;"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn custom-voltar-btn cancel-reply">Cancelar</button>
          <button type="submit" class="btn custom-comentarios-btn submit-reply">Comentar</button>
        </div>
      `;

      // Append form inside commentCard (above replies container)
      const repliesContainer = commentCard.querySelector('.replies-container');
      commentCard.insertBefore(form, repliesContainer);

      // Handle cancel button
      form.querySelector('.cancel-reply').addEventListener('click', () => form.remove());

      // Handle submit
      form.addEventListener('submit', function (evt) {
        evt.preventDefault();
        const text = form.querySelector('.reply-text').value.trim();
        if (!text) return;

        // Create reply card (same visual style)
        const replyCard = document.createElement('div');
        replyCard.className = 'reply-card';
        replyCard.style.border = '2px solid #1383EE';
        replyCard.style.borderRadius = '20px';
        replyCard.style.padding = '16px';
        replyCard.style.marginTop = '12px';
        replyCard.innerHTML = `<p><strong>Você</strong> <span style="color: #888;">Agora</span></p><p>${escapeHtml(text)}</p>`;

        repliesContainer.appendChild(replyCard);

        // Send to server and handle response to get insertId
        const animalId = document.location.pathname.split('/')[2]; // /animais/:id/comentarios
        fetch(`/animais/${animalId}/comentarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: text, parent_id: commentId }),
        })
          .then((resp) => resp.json())
          .then((data) => {
            if (data && data.insertId) {
              // mark reply with server id
              replyCard.setAttribute('data-comment-id', data.insertId);
              // Optionally show a small saved indicator
              const saved = document.createElement('div');
              saved.style.fontSize = '12px';
              saved.style.color = '#666';
              saved.style.marginTop = '8px';
              saved.textContent = 'Salvo';
              replyCard.appendChild(saved);
            }
          })
          .catch((err) => {
            console.warn('Não foi possível enviar comentário ao servidor:', err);
          });

        // remove form after submit
        form.remove();
      });
    }

    // If cancel inside a top-level add comment form
    const cancelTop = e.target.closest('.cancel-top-reply');
    if (cancelTop) {
      const topForm = document.getElementById('adicionar-comentario');
      if (topForm) {
        topForm.querySelector('#comment').value = '';
      }
      return;
    }
  });

  // Handle top-level comment form via AJAX
  const topForm = document.getElementById('adicionar-comentario');
  if (topForm) {
    topForm.addEventListener('submit', function (evt) {
      evt.preventDefault();
      const textarea = topForm.querySelector('#comment');
      const text = textarea.value.trim();
      if (!text) return;

      const commentsList = document.getElementById('comments-list');
      // create comment card
      const commentCard = document.createElement('div');
      commentCard.className = 'comment-card';
      commentCard.style.border = '2px solid #1383EE';
      commentCard.style.borderRadius = '20px';
      commentCard.style.padding = '20px';
      commentCard.style.marginTop = '12px';
      commentCard.innerHTML = `<p><strong>Você</strong> <span style="color: #888;">Agora</span></p><p>${escapeHtml(text)}</p><div style="margin-top:12px;"><button class="btn custom-comentarios-btn reply-btn">Comentar</button></div><div class="replies-container" style="margin-top:12px;"></div>`;

      // append to list
      if (commentsList) {
        commentsList.appendChild(commentCard);
      }

      // send to server
      const animalId = document.location.pathname.split('/')[2];
      fetch(`/animais/${animalId}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: text }),
      })
        .then((resp) => resp.json())
        .then((data) => {
          if (data && data.insertId) {
            commentCard.setAttribute('data-comment-id', data.insertId);
            const saved = document.createElement('div');
            saved.style.fontSize = '12px';
            saved.style.color = '#666';
            saved.style.marginTop = '8px';
            saved.textContent = 'Salvo';
            commentCard.appendChild(saved);
          }
        })
        .catch((err) => console.warn('Erro ao salvar comentário:', err));

      // clear textarea
      textarea.value = '';
      // scroll to the newly added comment
      commentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Simple HTML escape
  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m];
    });
  }
});
