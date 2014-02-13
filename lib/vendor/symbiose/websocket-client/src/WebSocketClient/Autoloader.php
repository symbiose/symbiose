<?php

namespace WebSocketClient;

/**
 * Autoloads WebSocketClient classes
 *
 * @package websocket-client
 */
class Autoloader
{
    /**
     * Register the autoloader
     *
     * @return  void
     */
    public static function register()
    {
        spl_autoload_register(array(new self, 'autoload'));
    }

    /**
     * Autoloader
     *
     * @param   string
     * @return  mixed
     */
    public static function autoload($class)
    {
        if (0 === stripos($class, 'WebSocketClient')) {
            $file = preg_replace('{^WebSocketClient\\\?}', '', $class);
            $file = str_replace('\\', '/', $file);
            $file = realpath(__DIR__ . (empty($file) ? '' : '/') . $file . '.php');
            if (is_file($file)) {
                require_once $file;
                return true;
            }
        }
        return null;
    }
}