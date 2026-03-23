package org.example;

public class Main {
    public static void main(String[] args) {

        Transacao gasto1 = new Transacao("Lanche", 25.50);
        Transacao gasto2 = new Transacao("Internet", 100);

        gasto1.exibirResumo();
        gasto2.exibirResumo();
    }
}