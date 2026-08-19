package com.dtcz.helloworld.model.dto;

import java.io.Serializable;

/**
 * HelloWorld 响应 DTO。
 *
 * @author dtcz
 */
public class HelloWorldDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 问候消息 */
    private String message;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return "HelloWorldDTO{message='" + message + "'}";
    }
}