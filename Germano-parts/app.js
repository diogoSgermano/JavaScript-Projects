//============================================
// IMPORTAÇÕES DE MODULOS
//============================================

//importa handlebars
const { engine } = require('express-handlebars');

///importa o mysql
const mysql = require('mysql2');

// File Systems
const fileSystems=require('fs'); 

//importa dependencia para poder baixar arquivos
const fileupload =require('express-fileupload')

//importa o express
const express = require('express');

//carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

//============================================
// UTILIZANDO MODULOS
//============================================

//para usar o express, basta referenciar o app
const app=express();

app.use(fileupload());

//adiciona bootstrap
app.use('/bootstrap',express.static('./node_modules/bootstrap/dist'));

//adiciona a pasta public para arquivos estáticos (css, js, etc)
app.use(express.static('public'));

//configuração do handlebars
app.engine('handlebars',engine());
app.set('view engine','handlebars');
app.set('views','./views');

//============================================
// manipulação de dados para as rotas
//============================================
app.use(express.json()); //trata dados em formato json
app.use(express.urlencoded({extended:false})); //usado para trabalhar json em form


//============================================
// conexão com banco de dados
//============================================
// 
const db=mysql.createConnection({
   host: process.env.DB_HOST,
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_DATABASE
});

//tratamento da conexão
db.connect(function(erro){
   if(erro) throw erro;

   else{
      console.log('-- Conectado ao banco de dados')
   }
   
});

//============================================
// ROTAS
//============================================

//ROTA DA TELA INICIAL
app.get('/', function (req,res){
   let sql_select='SELECT * FROM produto;';

   db.query(sql_select,function(erro,retorno){
      res.render('inicio',{produto:retorno, botoesAcao: false, cssFile: 'cadastro-produto.css'})
   });
});




//ROTA  DE CADASTRO - SELECT
app.get('/cadastro-produto', function (req,res){
   let sql_select='SELECT * FROM produto;';

   db.query(sql_select,function(erro,retorno){
      // Mesmo que dê erro, renderiza a página para não travar a aplicação
      res.render('cadastro-produto', { produto:retorno || [], botoesAcao: true, cssFile: 'cadastro-produto.css' });
   });
});

//ROTA  DE CADASTRO - mensagem
app.get('/cadastro-produto:situacao', function (req,res){
   let sql_select='SELECT * FROM produto;';

   db.query(sql_select,function(erro,retorno){
      // Mesmo que dê erro, renderiza a página para não travar a aplicação
      res.render('cadastro-produto', { produto:retorno || [], botoesAcao: true, cssFile: 'cadastro-produto.css',situacao:req.params.situacao });
   });
});



//============================================
// POST
//============================================
   
//ROTA DE CADASTRO - POST
app.post('/cadastrar',function(req,res){
   // 1. Pega os dados do formulário
   const { descricao, referencia, marca, quantidade, preco } = req.body;
   let nome_imagem = null;
   let url_imagem = null;

   // 2. Verifica se uma imagem foi enviada
   if (req.files && req.files.imagem) {
      nome_imagem = req.files.imagem.name;
      url_imagem = '/images/' + nome_imagem; // Cria a URL que será salva no banco
   } else {
      // Define um nome padrão ou trata o erro se a imagem for obrigatória
      console.log("Nenhuma imagem enviada.");
   }

   // 3. Usa uma query parametrizada para segurança (prevenir SQL Injection)
   const sql_insert = `INSERT INTO produto(descricao, referencia, marca, quantidade, preco, url_foto_produto) VALUES (?, ?, ?, ?, ?, ?)`;
   const values = [descricao, referencia, marca, quantidade, preco, url_imagem]; // Usa a variável da URL

   // 4. Executa a query no banco de dados
   db.query(sql_insert, values, function(erro, retorno) {
      if (erro) {
         console.error("Erro ao inserir no banco de dados:", erro);
         return res.status(500).send("Erro ao cadastrar o produto.");
      }

      // 5. Se a query foi bem-sucedida e uma imagem foi enviada, salva o arquivo no disco
      if (nome_imagem) {
         req.files.imagem.mv(__dirname + '/public/images/' + nome_imagem);
      }

      console.log("Produto cadastrado com sucesso! Código:", retorno.insertId);
      res.redirect('/cadastro-produto');

   });
});





//============================================
// GET
//============================================

// ==============  EXCLUIR ==============
app.get('/excluir/:codigo', function(req, res) {
   const { codigo } = req.params;

   // 1. Primeiro, buscar o nome do arquivo da imagem no banco de dados
   const sql_select_image = 'SELECT url_foto_produto FROM produto WHERE codigo = ?';
   db.query(sql_select_image, [codigo], (erro_busca, retorno_busca) => {
      if (erro_busca) {
         console.error("Erro ao buscar produto para exclusão:", erro_busca);
         return res.status(500).send("Erro ao processar a exclusão.");
      }

      // 2. Apagar o arquivo de imagem do servidor, se ele existir
      if (retorno_busca.length > 0 && retorno_busca[0].url_foto_produto) {
         const imagePath = __dirname + '/public' + retorno_busca[0].url_foto_produto;
         fileSystems.unlink(imagePath, (err_unlink) => {
            // Apenas loga o erro se houver, mas continua para deletar do DB
            if (err_unlink) console.error("Erro ao deletar o arquivo de imagem:", err_unlink);
            else console.log("Arquivo de imagem deletado:", imagePath);
         });
      }

      // 3. Agora, deletar o registro do produto do banco de dados usando query parametrizada
      const sql_delete = 'DELETE FROM produto WHERE codigo = ?';
      db.query(sql_delete, [codigo], (erro_delete) => {
         if (erro_delete) {
            console.error("Erro ao deletar produto do banco de dados:", erro_delete);
            return res.status(500).send("Erro ao excluir o produto.");
         }
         console.log(`Produto com código ${codigo} excluído com sucesso.`);
         res.redirect('/cadastro-produto'); // Redireciona APÓS a operação
      });
   });
});

//============== EDITAR ==============

//rota para apenas exibir os dados dos produtos na area de cadastro de produtos
app.get('/cadastroAlterar/:codigo', function(req,res){
   const{codigo}= req.params;
   let sql_select=`SELECT * FROM produto WHERE codigo=?;`;
   db.query(sql_select,[codigo],function(erro,retorno){
      if (erro) throw erro;
      res.render('cadastro-Alterar',{cssFile: 'cadastro-produto.css', produto:retorno[0]});//retorno[0] vai retornar apenas 1 produto e suas colunas   
   });
});

//rota para editar os dados exibidos acima
app.post('/editar',function(req,res){
   const { codigo, descricao, referencia, marca, quantidade, preco } = req.body;

   const novaImagem = req.files && req.files.imagem ? req.files.imagem : null;
   
   let urlNovaImagem = null;

   // 2. Buscar a URL da imagem antiga para poder excluí-la se uma nova for enviada
   const sqlSelectImgAntiga = 'SELECT url_foto_produto FROM produto WHERE codigo = ?';

   db.query(sqlSelectImgAntiga, [codigo], (erroBusca, retornoBusca) => {
      if (erroBusca) {
         console.error("Erro ao buscar produto para edição:", erroBusca);
         return res.status(500).send("Erro ao processar a atualização.");
      }

      const urlImagemAntiga = (retornoBusca.length > 0) ? retornoBusca[0].url_foto_produto : null;
      
      let sqlUpdate;

      let values;

      // 3. Preparar a query SQL e os valores com base na existência de uma nova imagem
      if (novaImagem) {
         // Se uma nova imagem foi enviada, atualiza todos os campos, incluindo a URL da foto
         urlNovaImagem = '/images/' + novaImagem.name;
         sqlUpdate = `UPDATE produto SET descricao = ?, referencia = ?, marca = ?, quantidade = ?, preco = ?, url_foto_produto = ? WHERE codigo = ?`;
         values = [descricao, referencia, marca, quantidade, preco, urlNovaImagem, codigo];
      } else {
         // Se nenhuma imagem nova foi enviada, atualiza apenas os outros campos
         sqlUpdate = `UPDATE produto SET descricao = ?, referencia = ?, marca = ?, quantidade = ?, preco = ? WHERE codigo = ?`;
         values = [descricao, referencia, marca, quantidade, preco, codigo];
      }

      // 4. Executar a query de atualização no banco de dados
      db.query(sqlUpdate, values, (erroUpdate) => {
         if (erroUpdate) {
            console.error("Erro ao atualizar produto no banco de dados:", erroUpdate);
            return res.status(500).send("Erro ao atualizar o produto.");
         }

         // 5. Gerenciar os arquivos de imagem após a atualização do banco
         if (novaImagem) {
            // Move o novo arquivo de imagem para a pasta public/images
            novaImagem.mv(__dirname + '/public' + urlNovaImagem);

            // Se existia uma imagem antiga, exclui o arquivo do servidor
            if (urlImagemAntiga) {
               fileSystems.unlink(__dirname + '/public' + urlImagemAntiga, (errUnlink) => {
                  if (errUnlink) console.error("Erro ao deletar a imagem antiga:", errUnlink);
                  else console.log("Imagem antiga deletada com sucesso:", urlImagemAntiga);
               });
            }
         }

         console.log(`Produto com código ${codigo} atualizado com sucesso.`);
         res.redirect('/cadastro-produto');
      });
   });
   

});


//============================================
// LOGS
//============================================
console.log("-- Pagina inicial em: http://localhost:8080 ")

console.log("-- Cadastro em: http://localhost:8080/cadastro-produto ")

app.listen(8080);