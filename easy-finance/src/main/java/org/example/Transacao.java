package org.example;

public class Transacao {
    String descricao;
    double valor;

    public Transacao(String descricao, double valor){
        this.descricao = descricao;
        this.valor = valor;
    }

    public void exibirResumo(){
        System.out.println("Gasto: " + descricao + "Valor: R$ " + valor);
    }
}
