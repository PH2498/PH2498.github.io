package com.dtcz.helloworld.common.constant;

/**
 * HelloWorld 模块常量。
 *
 * @author dtcz
 */
public final class HelloWorldConstants {

    private HelloWorldConstants() {
        throw new IllegalStateException("Constant class");
    }

    /** 默认问候消息 */
    public static final String DEFAULT_GREETING = "Hello, World!";

    /** API 根路径 */
    public static final String API_BASE_PATH = "/api";
}