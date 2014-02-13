<?php
namespace lib;

use \RuntimeException;
use \Memcache;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpFoundation\Session\Storage\NativeSessionStorage;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\MemcacheSessionHandler;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\NativeSessionHandler;

class SessionProvider {
	const CONFIG_FILE = '/etc/sessions.json';

	/**
	 * Get sessions configuration.
	 * @return Config
	 */
	protected function _getConfig() {
		$configPath = './' . self::CONFIG_FILE;

		return new JsonConfig($configPath);
	}

	public function handler() {
		$config = $this->_getConfig()->read();

		$handler = $config['handler'];
		$handlerConfig = (isset($config['config'])) ? $config['config'] : array();

		switch ($handler) {
			case 'memcache':
				if (!isset($handlerConfig['host']) || !isset($handlerConfig['port'])) {
					throw new RuntimeException('You must specify memcache host and port in handler config in "'.self::CONFIG_FILE.'"');
				}

				$memcache = new Memcache;
				$memcache->addServer($handlerConfig['host'], (int) $handlerConfig['port']);

				return new MemcacheSessionHandler($memcache);
			case 'native':
			default:
				return new NativeSessionHandler;
		}
	}

	public function storage() {
		$handler = $this->handler();

		return new NativeSessionStorage(array(), $handler);
	}

	public function session() {
		$storage = $this->storage();

		return new Session($storage);
	}
}