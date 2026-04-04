package org.exemple;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConexaoDB {
    private static final  String URL = "jdbc:sqlite:data/easy-fincance.db";

}

public static Connection conectar(){
    try {
        return DriveManager.getConnection(URL);
    }catch (SQLExeception e) {
        System.out.println("Erro ao conectar no banco" + e.getMessage());
        return null;
    }
}