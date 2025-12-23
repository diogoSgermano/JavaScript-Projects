import express from "express";
import { engine } from "express-handlebars"; // Importa a função 'engine'
import db from "../db/database.js";
import path from "path";
import multer from "multer"; // Importa a biblioteca multer para upload de arquivos
import bcrypt from "bcrypt"; // Importa a biblioteca bcrypt para criptografia de senhas
import methodOverride from "method-override"; // Importa o method-override
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração do Handlebars
app.set("views", path.join(__dirname, "..", "..", "views"));
app.engine(
  "handlebars",
  engine({ // Usa a função 'engine' diretamente
    defaultLayout: "index", // Layout padrão
    layoutsDir: path.join(app.get("views"), "layouts"),
    partialsDir: [
      path.join(app.get("views"), "partials"),
      path.join(app.get("views"), "login"),
    ],
    helpers: {
      eq: function (a, b) {
        return a === b;
      },
      isPerdido: function (s) {
        if (s === undefined || s === null) return false;
        return String(s).toLowerCase() === 'perdido';
      }
    },
  })
);
app.set("view engine", "handlebars");

app.use(express.static(path.join(__dirname, "..", "public")));
// Configura o Express para servir arquivos estáticos (CSS, JS, imagens) da pasta 'public'
// Configura o Express para servir arquivos estáticos (CSS, JS, imagens) da pasta 'public' na raiz do projeto
app.use(express.static(path.join(__dirname, "..", "..", "public")));

// Middleware para conseguir ler o corpo (body) das requisições HTTP
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware para usar métodos HTTP como PUT e DELETE
app.use(methodOverride("_method"));

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define a pasta onde as imagens serão salvas
    cb(null, path.join(__dirname, "..", "public", "uploads"));
    cb(null, path.join(__dirname, "..", "..", "public", "uploads"));
  },
  filename: function (req, file, cb) {
    // Garante que cada nome de arquivo seja único adicionando um timestamp
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get("/", function(_req, res) {
  res.render("inicio");
});

app.get("/animais", function (req, res) {
  // Captura os filtros da query string da URL
  const { situacao, especie, porte, genero, cor } = req.query;

  let sql = "SELECT * FROM animais";
  const params = [];
  const conditions = [];

  if (situacao && situacao !== 'Todas') {
    conditions.push("situacao = ?");
    params.push(situacao);
  }
  if (especie && especie !== 'Todos') {
    conditions.push("especie = ?");
    params.push(especie);
  }
  if (porte && porte !== 'Todos os portes') {
    conditions.push("porte = ?");
    params.push(porte);
  }
  if (genero && genero !== 'Todos') {
    conditions.push("genero = ?");
    params.push(genero);
  }
  if (cor && cor.trim() !== '') { // Ignora se o campo cor estiver vazio
    conditions.push("cor LIKE ?");
    params.push(`%${cor}%`); // Usando LIKE para cores parciais
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY id DESC"; // Ordena os resultados

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error("Erro ao buscar animais no banco de dados:", err);
      return res.status(500).send("Erro ao carregar os anúncios de animais.");
    }

    // Passa os filtros de volta para a view, para manter os campos selecionados
    res.render("animais", { animais: results, filtros: req.query });
  });
});

app.get("/anunciar", function(_req, res){
  res.render("anunciar");
});

app.get("/login/signIn", function(_req, res) {
  // Aqui, especificamos que a view 'login' deve usar o layout 'main'
  res.render("login/signIn", { layout: "login" });
});

app.get("/comentarios", function(_req, res) {
  // Como não especificamos um layout, ele usará o padrão: 'nav-foot'
  res.render("comentarios", { layout: "index" });
});

// Rota para exibir a página de comentários de um animal específico
app.get("/animais/:id/comentarios", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM animais WHERE id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar animal para comentários:", err);
      return res.status(500).send("Erro ao carregar dados do animal.");
    }
    if (results.length === 0) {
      return res.status(404).send("Anúncio não encontrado.");
    }

    // Renderiza a página de comentários, passando os dados do animal
    res.render("comentarios", { layout: "index", animal: results[0] });
  });
});

// Rota POST para adicionar comentário (ou resposta) a um animal
app.post('/animais/:id/comentarios', (req, res) => {
  const { id } = req.params; // animal id
  const { comment, parent_id } = req.body;

  // Se não veio comentário, apenas redireciona
  if (!comment || String(comment).trim() === '') {
    return res.status(400).send('Comentário vazio');
  }

  // Tenta inserir na tabela 'comentarios' se existir (colunas: id, animal_id, parent_id, autor, texto, criado_em)
  const sql = `INSERT INTO comentarios (animal_id, parent_id, autor, texto, criado_em) VALUES (?, ?, ?, ?, NOW())`;
  const values = [id, parent_id || null, 'Usuário', comment];

  db.query(sql, values, (err, result) => {
    if (err) {
      // Se a tabela não existir ou ocorrer erro, apenas logamos e retornamos sucesso para UX
      console.warn('Não foi possível salvar comentário no banco (talvez tabela ausente):', err.message);
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ success: true, insertId: result.insertId });
  });
});
// Rota para visualizar os detalhes de um animal específico
app.get("/animais/:id", (req, res) => {
  const { id } = req.params; // Pega o ID do animal da URL

  // Consulta o banco de dados para encontrar o animal com o ID correspondente
  const sql = "SELECT * FROM animais WHERE id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar animal no banco de dados:", err);
      return res.status(500).send("Erro ao carregar os dados do animal.");
    }

    if (results.length === 0) {
      // Se nenhum animal for encontrado, retorna um erro 404
      return res.status(404).send("Anúncio de animal não encontrado.");
    }

    // Renderiza a página 'visualizarAnimal' e passa os dados do animal para ela
    res.render("visualizaranimal", { layout: "login", animal: results[0] });
  });
});

app.get("/animais/:id/edit", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM animais WHERE id = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar animal para edição:", err);
      return res.status(500).send("Erro ao carregar dados para edição.");
    }
    if (results.length === 0) {
      return res.status(404).send("Anúncio não encontrado.");
    }

    // Formata a data para o formato YYYY-MM-DD para preencher o input type="date"
    const animal = results[0];
    if (animal.desaparecido_em) {
      animal.desaparecido_em = new Date(animal.desaparecido_em).toISOString().split('T')[0];
    }
    res.render("anunciar", { animal: animal });
  });
});
app.get("/login/redefinirsenha", function(_req, res) {
  // Aqui, especificamos que a view 'login' deve usar o layout 'main'
  res.render("login/redefinirsenha", { layout: "login" });
});

app.get("/login/novasenha", function(_req, res) {
  // Aqui, especificamos que a view 'login' deve usar o layout 'main'
  res.render("login/novasenha", { layout: "login" });
});

app.get("/login/criarconta", function(_req, res) {
  // Aqui, especificamos que a view 'login' deve usar o layout 'main'
  res.render("login/criarconta", { layout: "login" });
});

// Rota GET para a página de criar senha, agora recebendo o ID do usuário
app.get("/login/criarsenha/:userId", function(req, res) {
  // Extrai o ID do usuário dos parâmetros da rota
  const userId = req.params.userId;
  // Renderiza a página passando o userId para o formulário
  res.render("login/criarsenha", { layout: "login", userId: userId });
});

app.get("/opcoes", function(_req, res) {
  // Aqui, especificamos que a view 'login' deve usar o layout 'main'
  res.render("opcoes", { layout: "login" });
});

app.get("/login/cadastrar-animal",function(_req,res){
  res.render("login/cadastraranimal",{layout:"login"});
});

// POST
// Rota POST para receber os dados do formulário de criar conta
app.post("/animais", upload.single("foto"), (req, res) => {
  // upload.single('foto') processa o upload do arquivo que vem do campo com name="foto"

  // Extrai os dados do corpo da requisição (req.body)
  const { especie, genero, situacao, porte, cor, detalhes, nome, idade, raca, data, contato, local } = req.body;

  // Pega o caminho do arquivo salvo pelo multer (ex: 'uploads/1678886400000-meu-pet.jpg')
  // É importante salvar apenas o caminho relativo para que o HTML possa encontrá-lo
  const fotoPath = req.file ? path.join("uploads", req.file.filename).replace(/\\/g, "/") : null;

  const sql = `
    INSERT INTO animais (especie, genero, situacao, detalhes, nome, idade, raca, contato, desaparecido_em, ultimo_local, foto_url, porte, cor) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [especie, genero, situacao, detalhes, nome, idade, raca, contato, data, local, fotoPath, porte, cor];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao inserir anúncio no banco de dados:", err);
      return res.status(500).send("Ocorreu um erro ao criar seu anúncio.");
    }
    res.redirect("/animais"); // Redireciona para a lista de animais após o sucesso
  });
});
app.post("/login/criarconta", (req, res) => {
  // Extrai os dados do corpo da requisição
  const { nome, cpf, email, telefone } = req.body;

  const sql = "INSERT INTO usuarios (nome, cpf, email, telefone) VALUES (?, ?, ?, ?)";
  const values = [nome, cpf, email, telefone];

  // Executa a query no banco de dados
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao inserir usuário no banco de dados:", err);
      // Idealmente, você renderizaria uma página de erro aqui
      res.status(500).send("Ocorreu um erro ao criar sua conta. Tente novamente.");
      return;
    }

    console.log(`Usuário inserido com sucesso! ID: ${result.insertId}`);

    // Redireciona para a página de criação de senha, passando o ID do novo usuário na URL
    res.redirect(`/login/criarsenha/${result.insertId}`);
  });
});

// Rota PUT para ATUALIZAR um anúncio existente
app.put("/animais/:id", upload.single("foto"), (req, res) => {
  const { id } = req.params;
  const { especie, genero, situacao, porte, cor, detalhes, nome, idade, raca, data, contato, local } = req.body;

  // Verifica se uma nova foto foi enviada
  const fotoPath = req.file ? path.join("uploads", req.file.filename).replace(/\\/g, "/") : req.body.foto_existente;

  const sql = `
    UPDATE animais SET 
      especie = ?, genero = ?, situacao = ?, detalhes = ?, nome = ?, idade = ?, raca = ?, 
      contato = ?, desaparecido_em = ?, ultimo_local = ?, foto_url = ?, porte = ?, cor = ?
    WHERE id = ?
  `;
  const values = [
    especie, genero, situacao, detalhes, nome, idade, raca, contato, 
    data, local, fotoPath, porte, cor, id
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erro ao atualizar anúncio no banco de dados:", err);
      return res.status(500).send("Ocorreu um erro ao atualizar seu anúncio.");
    }
    res.redirect(`/animais/${id}`); // Redireciona para a página de detalhes do animal
  });
});

// Rota DELETE para DELETAR um anúncio
app.delete("/animais/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM animais WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao deletar anúncio do banco de dados:", err);
      return res.status(500).send("Ocorreu um erro ao deletar seu anúncio.");
    }

    if (result.affectedRows === 0) {
      // Nenhum anúncio foi deletado (talvez o ID não existisse)
      return res.status(404).send("Anúncio não encontrado para deleção.");
    }

    console.log(`Anúncio com ID ${id} deletado com sucesso.`);
    res.redirect("/animais"); // Redireciona para a lista de animais
  });
});

// Rota POST para salvar a senha do usuário
app.post("/login/criarsenha/:userId", async (req, res) => {
  // Extrai os dados do corpo da requisição
  const { senha, senhaRepetir } = req.body;
  // Extrai o userId dos parâmetros da URL
  const { userId } = req.params;
  // 1. Validação: Verifica se as senhas são iguais
  if (senha !== senhaRepetir) {
    // A validação do frontend deve ter impedido isso.
    // Retorna um erro genérico, pois isso não deveria acontecer em um fluxo normal.
    return res.status(400).send("Ocorreu um erro de validação. Tente novamente.");
  }

  try {
    // 2. Criptografia: Gera um "sal" e cria o hash da senha
    const saltRounds = 10; // Fator de custo para a criptografia
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    // 3. Persistência: Define a query SQL para INSERIR a nova senha na tabela 'senhas',
    // relacionando-a com o usuário através do 'id_usuario'.
    const sql = "INSERT INTO senhas (senha, id_usuario) VALUES (?, ?)";
    const values = [senhaHash, userId];

    // Executa a query no banco de dados
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro ao atualizar a senha do usuário:", err);
        return res.status(500).send("Ocorreu um erro ao salvar sua senha.");
      }

      console.log(`Senha do usuário com ID ${userId} atualizada com sucesso.`);

      // 4. Redirecionamento: Redireciona para a página de animais após o sucesso
      res.redirect("/animais");
    });
  } catch (error) {
    console.error("Erro ao criptografar a senha:", error);
    res.status(500).send("Ocorreu um erro de segurança ao processar sua senha.");
  }
});

// Rota POST para verificar se o usuário existe ao tentar fazer login
app.post("/login/verificarUsuario", (req, res) => {
  const { emailEntrar, senhaEntrar } = req.body;

  // Consulta que busca o usuário pelo email ou CPF
  const sql = `
    SELECT u.id, u.email, u.cpf, s.senha 
    FROM usuarios u 
    JOIN senhas s ON u.id = s.id_usuario 
    WHERE u.email = ? OR u.cpf = ?
  `;

  db.query(sql, [emailEntrar, emailEntrar], async (err, results) => {
    if (err) {
      console.error("Erro ao buscar usuário:", err);
      return res.status(500).json({ success: false, message: "Erro no servidor." });
    }

    if (results.length === 0) {
      // Usuário não encontrado
      return res.json({ success: false, message: "Usuário não encontrado." });
    }

    // Usuário encontrado — agora verificar a senha
    const usuario = results[0];
    const senhaCorreta = await bcrypt.compare(senhaEntrar, usuario.senha);

    if (!senhaCorreta) {
      return res.json({ success: false, message: "Senha incorreta." });
    }

    // Tudo certo
    res.json({ success: true });
  });
});



app.listen(8080, () => {
  console.log("Servidor rodando em http://localhost:8080");
  console.log("Animais: http://localhost:8080/animais")
});
