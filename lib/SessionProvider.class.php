<?php
namespace lib;

use \RuntimeException;
use Symfony\Component\HttpFoundation\Session\Session;
use Symfony\Component\HttpFoundation\Session\Storage\NativeSessionStorage;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\MemcacheSessionHandler;
use Symfony\Component\HttpFoundation\Session\Storage\Handler\NativeSessionHandler;

class SessionProvider {
	const CONFIG_FILE = '/etc/sessions.json';

	protected $handler;
	protected $storage;
	protected $session;

	protected static $provider;

	/**
	 * Get sessions configuration.
	 * @return Config
	 */
	protected function _getConfig() {
		$configPath = './' . self::CONFIG_FILE;

		return new JsonConfig($configPath);
	}

	public function handler() {
		if (!empty($this->storage)) {
			$handler = $this->handler;
		} else {
			$config = $this->_getConfig()->read();

			$handlerName = $config['handler'];
			$handlerConfig = (isset($config['config'])) ? $config['config'] : array();

			switch ($handlerName) {
				case 'memcache':
					if (!isset($handlerConfig['host']) || !isset($handlerConfig['port'])) {
						throw new RuntimeException('You must specify memcache host and port in handler config in "'.self::CONFIG_FILE.'"');
					}

					$memcache = new \Memcache;
					$memcache->addServer($handlerConfig['host'], (int) $handlerConfig['port']);

					$handler = new MemcacheSessionHandler($memcache);
					break;
				case 'native':
				default:
					$handler = new NativeSessionHandler;
			}
		}

		return $handler;
	}

	public function storage() {
		if (!empty($this->storage)) {
			$storage = $this->storage;
		} else {
			$handler = $this->handler();

			$storage = new NativeSessionStorage(array(), $handler);
			$this->storage = $storage;
		}

		return $storage;
	}

	public function session() {
		if (!empty($this->session)) {
			$session = $this->session;
		} else {
			$storage = $this->storage();

			$session = new Session($storage);
			$this->session = $session;
		}

		return $session;
	}

	public static function get() {
		if (!empty(self::$provider)) {
			$provider = self::$provider;
		} else {
			$provider = new self;
			self::$provider = $provider;
		}

		return $provider;
	}
}