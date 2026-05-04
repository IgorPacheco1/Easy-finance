package org.example;
//import org.sqlite.JDBC;

public class Main {
    public static void main(String[] args) {

        var conexao = ConexaoDB.conectar();
        if (conexao != null) {
            System.out.println("deu bom");
            try {
                conexao.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            System.out.println("deu ruim");
        }



        Transacao novoGasto = new Transacao("Lanche", 25.50, "2026-05-04");


        ConexaoDB.salvarTransacao(novoGasto);

