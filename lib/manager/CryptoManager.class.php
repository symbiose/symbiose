<?php
namespace lib\manager;

use \core\Manager;
use \RuntimeException;
use \InvalidArgumentException;

/**
 * Cryptography functions.
 * @package lighp
 * @author emersion
 */
class CryptoManager extends Manager {
	/**
	 * Check if the current PHP installation supports password_hash() polyfill.
	 * @return boolean True if it's supported, false otherwise.
	 * @see https://github.com/ircmaxell/password_compat#requirements
	 */
	protected function _supportsBasicHash() {
		if (version_compare(PHP_VERSION, '5.3.7') >= 0) {
			return true;
		}

		if (function_exists('password_hash')) {
			$hash = '$2y$04$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
			$test = crypt("password", $hash);
			return ($test == $hash);
		} else {
			return false;
		}
	}

	public function hashPassword($password, $hashGenerator = null) {
		if (empty($hashGenerator)) {
			$hashGenerator = $this->getHashGenerator();
		}
		
		$hash = $this->generateHash($hashGenerator, $password);

		return $hash;
	}

	public function verifyPassword($password, $hash, $hashGenerator = 'sha512') {
		$info = password_get_info($hash);
		if ($info['algo'] != 0) { //Hash generated with password_hash() or crypt()
			if ($this->_supportsBasicHash()) {
				return password_verify($password, $hash);
			} else {
				$passwordHash = $this->generateCryptHash($hashGenerator, $password, $hash);

				return ($hash === $passwordHash);
			}
		} else {
			$passwordHash = $this->generateHash($hashGenerator, $password);

			return ($hash === $passwordHash);
		}
	}

	public function needsRehash($hash) {
		if (!$this->_supportsBasicHash()) {
			return false;
		}

		$info = password_get_info($hash);
		if ($info['algo'] == 0) {
			return true;
		}

		return password_needs_rehash($hash, PASSWORD_DEFAULT);
	}

	// SALT

	/**
	 * Get the prefered salt generator.
	 * @return string The generator's name.
	 */
	public function getSaltGenerator() {
		if (function_exists('mcrypt_create_iv')) {
			return 'mcrypt';
		}

		if (extension_loaded('openssl')) {
			return 'openssl';
		}

		return 'basic';
	}

	/**
	 * Generate a salt using the given generator.
	 * @param  string $generator The generator name.
	 * @return string            The generated salt.
	 */
	public function generateSalt($generator) {
		if (empty($generator)) {
			throw new InvalidArgumentException('Invalid salt generator name (empty string)');
		}

		$methodName = 'generate'.ucfirst($generator).'Salt';

		if (!method_exists($this, $methodName)) {
			throw new RuntimeException('Cannot find salt generator "'.$generator.'"');
		}

		return $this->$methodName();
	}

	public function generateMcryptSalt() {
		if (!function_exists('mcrypt_create_iv')) {
			throw new RuntimeException('Mcrypt extension not loaded');
		}

		return mcrypt_create_iv(66, MCRYPT_DEV_URANDOM);
	}

	public function generateOpensslSalt() {
		if (!extension_loaded('openssl')) {
			throw new RuntimeException('Openssl extension not loaded');
		}

		return base64_encode(openssl_random_pseudo_bytes(66));
	}

	public function generateBasicSalt() {
		return uniqid('', true);
	}

	// HASH

	/**
	 * Get the prefered hash generator.
	 * @return string The generator's name.
	 */
	public function getHashGenerator() {
		if ($this->_supportsBasicHash()) {
			return 'basic';
		}

		return 'crypt';
	}

	/**
	 * Generate a hash using the given generator.
	 * @param  string $generator The generator name.
	 * @param  string $password  The password.
	 * @param  string $salt      The salt.
	 * @return string            The generated hash.
	 */
	public function generateHash($generator, $password, $salt = '') {
		if (empty($generator)) {
			throw new InvalidArgumentException('Invalid hash generator name (empty string)');
		}

		$methodName = 'generate'.ucfirst($generator).'Hash';

		if (!method_exists($this, $methodName)) {
			throw new RuntimeException('Cannot find hash generator "'.$generator.'"');
		}

		return $this->$methodName($password, $salt);
	}

	public function generatePbkdf2Hash($password, $salt) {
		if (!function_exists('hash_pbkdf2')) {
			throw new RuntimeException('Native pbkdf2 function not available');
		}

		return hash_pbkdf2('sha256', $password, $salt, 0xFFFF, 0);
	}

	public function generateBasicHash($password) {
		return password_hash($password, PASSWORD_DEFAULT);
	}

	public function generateCryptHash($password, $salt) {
		return crypt($password, '$6$rounds=5000$'.$salt.'$');
	}

	public function generateSha512Hash($password, $salt) {
		return hash('sha512', $password.$salt);
	}
}