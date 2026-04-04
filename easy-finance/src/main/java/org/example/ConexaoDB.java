package org.example;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;

public class ConexaoDB {
    private static final String URL = "jdbc:sqlite:data/easy-finance.db";

    public static Connection conectar() {
        try {
            return DriverManager.getConnection(URL);
        } catch (SQLException e) {
            System.out.println("Erro ao conectar no banco: " + e.getMessage());
            return null;
        }
    }

    public static  void criarTabelas(Connection conexao){
        String sql = "CREATE TABLE IF NOT EXISTS transacoes(" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "descricao TEXT, " +
                "valor REAL, " +
                "data TEXT)";
        try {
            Statement stmt = conexao.createStatement();
            stmt.execute(sql);
            System.out.println("tabela criada com sucesso");
        }catch (SQLException e){
            System.out.println("Erro ao criar a tabela");
        }
    }
}