package org.example;

import java.sql.*;
import java.io.File;

public class ConexaoDB {

    private static final String URL = "jdbc:sqlite:data/easy-finance.db";

    public static Connection conectar() {
        try {
            File diretorio = new File("data");
            if (!diretorio.exists()) {
                diretorio.mkdirs();
            }
            return DriverManager.getConnection(URL);
        } catch (SQLException e) {
            System.out.println("Erro ao conectar no banco: " + e.getMessage());
            return null;
        }
    }

    public static void criarTabelas(Connection conexao) {
        String sql = "CREATE TABLE IF NOT EXISTS transacoes (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "descricao TEXT, " +
                "valor REAL, " +
                "data TEXT);";
        try (Statement stmt = conexao.createStatement()) {
            stmt.execute(sql);
            System.out.println("✅ Tabela pronta!");
        } catch (SQLException e) {
            System.out.println("❌ Erro na tabela: " + e.getMessage());
        }
    }

    public static void salvarTransacao(Transacao transacao) {
        String sql = "INSERT INTO transacoes (descricao, valor, data) VALUES (?, ?, ?)";
        try (Connection conn = conectar();
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, transacao.getDescricao());
            pstmt.setDouble(2, transacao.getValor());
            pstmt.setString(3, transacao.getData());

            pstmt.executeUpdate();
            System.out.println("💰 Gasto salvo com sucesso!");
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public static void listarTransacoes() {
        String sql = "SELECT * FROM transacoes";
        try (Connection conn = conectar();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            System.out.println("\n--- MEUS GASTOS ---");
            while (rs.next()) {
                System.out.println(rs.getInt("id") + " | " +
                        rs.getString("descricao") + " | R$ " +
                        rs.getDouble("valor"));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

}