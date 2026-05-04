package org.example;

import java.sql.Connection;

public class Main {
    public static void main(String[] args) {
        Connection conexao = ConexaoDB.conectar();

        if (conexao != null) {

            ConexaoDB.criarTabelas(conexao);
            Transacao teste = new Transacao("Lanche de Teste", 35.90, "2026-05-04");
            ConexaoDB.salvarTransacao(teste);
            System.out.println("Buscando dados no arquivo...");
            ConexaoDB.listarTransacoes();

        } else {
            System.out.println("❌ Não foi possível conectar ao banco de dados.");
        }
    }
}