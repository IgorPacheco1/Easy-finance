package org.example;
import org.sqlite.JDBC;

public class Main {
    public static void main(String[] args) {

    var conexao = ConexaoDB.conectar();
    if (conexao != null){
        System.out.println("deu bom");
        try {
            conexao.close();
        }catch (Exception e){
            e.printStackTrace();
        }
    }else {
        System.out.println("deu ruim");
    }


    }
}