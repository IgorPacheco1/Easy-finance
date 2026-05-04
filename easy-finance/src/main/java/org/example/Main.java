package org.example;

import java.sql.Connection;

public class Main {
    public static void main(String[] args) {

        Connection conexao = ConexaoDB.conectar();

        if (conexao != null) {
            System.out.println("✅ Conexão estabelecida com sucesso!");
            Transacao novoGasto = new Transacao("Lanche", 25.50, "2026-05-04");
            ConexaoDB.salvarTransacao(novoGasto);
            try {
                conexao.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            System.out.println("❌ Falha na conexão. Verifique o banco de dados.");
        }
    }
}