<?php
namespace lib\ctrl\api;

use \lib\entities\User;
use \lib\entities\UserAuthorization;
use \lib\entities\UserToken;
use \lib\entities\Email;

/**
 * Manage users.
 * @author $imon
 */
class UserController extends \lib\ApiBackController {
	// GETTERS

	/**
	 * Get public data about a specified user (password hash is not public).
	 * @param  User $userData The user data.
	 * @return array          The public user data.
	 */
	protected function _userPublicAttributes(User $userData) {
		return array(
			'id' => $userData['id'],
			'username' => $userData['username'],
			'realname' => $userData['realname'],
			'email' => $userData['email'],
			'disabled' => $userData['disabled']
		);
	}

	/**
	 * Get user attributes that can be edited.
	 * @return array The list of attributes that can be edited.
	 */
	protected function _userEditableAttributes() {
		return array(
			'realname',
			'email'
		);
	}

	/**
	 * Autocomplete a user id.
	 * @param  int $userId The user id. If not provided, the user will be the logged in one.
	 * @return int         The completed user id.
	 */
	protected function _autocompleteUserId($userId = null) {
		$manager = $this->managers()->getManagerOf('user');
		$user = $this->app()->user();

		if ($userId === null) {
			if ($user->isLogged()) {
				$userId = $user->id();
			} else {
				throw new \RuntimeException('No user specified', 404);
			}
		} else {
			if (!$manager->exists($userId)) {
				throw new \RuntimeException('Cannot find the user with id "'.$userId.'"', 404);
			}
		}

		return $userId;
	}

	/**
	 * Check if home directory exists. If not, create it.
	 * @param  string $homeDir The home directory path.
	 */
	protected function _checkHomeDir($homeDir) {
		$fileManager = $this->managers()->getManagerOf('file');
		$translationManager = $this->managers()->getManagerOf('translation');

		//Copy default home directory files
		if (!$fileManager->exists($homeDir)) {
			$fileManager->copy('/etc/ske1/', $homeDir, true);
		}

		//Create default folders
		$dict = $translationManager->load('webos');
		$userDirnames = array(
			'Documents',
			'Desktop',
			'Pictures',
			'Music',
			'Videos',
			'Downloads'
		);
		foreach($userDirnames as $dirname) {
			$dirpath = $homeDir . '/' . $dict->get($dirname);
			if (!$fileManager->exists($dirpath)) {
				$fileManager->mkdir($dirpath);
			}
		}
	}

	/**
	 * Check if registration is enabled.
	 * @return array An array containing the registration status.
	 */
	public function executeCanRegister() {
		$manager = $this->managers()->getManagerOf('user');
		$configManager = $this->managers()->getManagerOf('config');

		$canRegister = true;
		$autoEnable = false;

		$config = $configManager->open('/etc/register.json');
		$configData = $config->read();

		$registrationEnabled = $configData['register'];
		if (!$registrationEnabled) {
			$canRegister = false;
		} else {
			$maxUsers = (int) $configData['maxUsers'];
			$nbrUsers = $manager->countAll();
			if ($maxUsers !== false && $maxUsers >= 0 && $nbrUsers + 1 > $maxUsers) {
				$canRegister = false;
			}
		}

		$autoEnable = $configData['autoEnable'];

		return array('register' => $canRegister, 'autoEnable' => $autoEnable);
	}

	/**
	 * Check if resetting password by e-mail is enabled.
	 * @return array
	 */
	public function executeCanResetPassword() {
		$manager = $this->managers()->getManagerOf('user');
		$configManager = $this->managers()->getManagerOf('config');

		$config = $configManager->open('/etc/email.json');
		$configData = $config->read();

		$mailEnabled = (isset($configData['enabled']) && $configData['enabled'] == true);
		$resetPasswordEnabled = $mailEnabled;

		$mailDelay = (isset($configData['delay']) && is_int($configData['delay'])) ? (int) $configData['delay'] : 120;

		$mailFrom = $configData['from'];

		return array(
			'enabled' => $resetPasswordEnabled,
			'delay' => $mailDelay,
			'emailFrom' => $mailFrom
		);
	}

	/**
	 * Get the user's list.
	 */
	protected function executeGetList() {
		$manager = $this->managers()->getManagerOf('user');

		$users = $manager->listAll();

		$list = array();
		foreach($users as $user) {
			$list[$user['id']] = $this->_userPublicAttributes($user);
		}

		return $list;
	}

	/**
	 * Get data about a specified user.
	 * @param int $userId The user id. If not provided, the user will be the logged in one.
	 */
	public function executeGetAttributes($userId = null) {
		$manager = $this->managers()->getManagerOf('user');

		$userId = $this->_autocompleteUserId($userId);

		$user = $manager->getById($userId); //Get user data

		if (empty($userData)) {
			throw new \RuntimeException('Cannot find user with id "'.$userId.'"', 404);
		}

		return $this->_userPublicAttributes($user);
	}

	/**
	 * Get data about a specified user, giving his username.
	 * @param string $username The username.
	 */
	public function executeGetAttributesByUsername($username) {
		$manager = $this->managers()->getManagerOf('user');

		$userData = $manager->getByUsername($username); //Get user data

		if (empty($userData)) {
			throw new \RuntimeException('Cannot find user with username "'.$username.'"', 404);
		}

		return $this->_userPublicAttributes($userData);
	}

	/**
	 * Get a specified data about a specified user.
	 * @param string $attribute The data name.
	 * @param int    $userId    The user id. If not provided, the user will be the logged in one.
	 * @deprecated
	 */
	public function executeGetAttribute($attribute, $userId = null) {
		$userData = $this->executeGetAttributes($userId);

		if (!isset($userData[$attribute])) {
			throw new \RuntimeException('Cannot find user attribute "'.$attribute.'"', 404);
		}

		return array($attribute => $userData[$attribute]);
	}

	/**
	 * Get data about the logged in user.
	 */
	public function executeGetLogged() {
		$manager = $this->managers()->getManagerOf('user');
		$user = $this->app()->user();

		if (!$user->isLogged()) { //User not logged in
			return null;
		}

		$userData = $manager->getById($user->id()); //Get user data
		return $this->_userPublicAttributes($userData);
	}

	/**
	 * Get a specified user's authorizations.
	 * @param int $userId The user id. If not provided, the user will be the logged in one.
	 */
	public function executeGetAuthorizations($userId = null) {
		$manager = $this->managers()->getManagerOf('user');
		$authManager = $this->managers()->getManagerOf('authorization');

		$userId = $this->_autocompleteUserId($userId);

		$auths = $authManager->getByUserId($userId);

		$list = array();

		foreach($auths as $auth) {
			$list[] = $auth['name'];
		}

		return $list;
	}

	/**
	 * Get a user's profile picture.
	 * @param  int $userId The user id.
	 */
	public function executeGetAvatar($userId = null) {
		$avatarManager = $this->managers()->getManagerOf('userAvatar');

		$data = array('avatar' => null);
		$userId = $this->_autocompleteUserId($userId);

		if (!$avatarManager->exists($userId)) {
			return $data;
		}

		$data['avatar'] = $avatarManager->getById($userId);

		return $data;
	}

	/**
	 * Get stats about users.
	 */
	public function executeGetStats() {
		$manager = $this->managers()->getManagerOf('user');
		$stats = array();

		$stats['nbr_users'] = $manager->countAll();

		return $stats;
	}

	// SETTERS

	/**
	 * Login a user.
	 * @param string $username The username.
	 * @param string $password The password.
	 */
	public function executeConnect($username, $password) {
		$manager = $this->managers()->getManagerOf('user');
		$cryptoManager = $this->managers()->getManagerOf('crypto');
		$user = $this->app()->user();

		if ($user->isLogged()) {
			$user->loggedOut();
		}

		$userData = $manager->getByUsername($username); //Get user

		if (empty($userData)) { //Invalid username
			sleep(3); //Pause script for 3s to prevent bruteforce attacks
			throw new \RuntimeException('Bad username or password', 401);
		}

		//Check that the user is not disabled
		if ($userData['disabled']) {
			throw new \RuntimeException('User "'.$username.'" is disabled', 403);
		}

		//Password check
		if (!$cryptoManager->verifyPassword($password, $userData['password'])) {
			sleep(3); //Pause script for 3s to prevent bruteforce attacks
			throw new \RuntimeException('Bad username or password', 401);
			return;
		}

		if ($cryptoManager->needsRehash($userData['password'])) {
			$userData['password'] = $cryptoManager->hashPassword($password);
			$manager->update($userData);
		}

		//Set the user as logged in
		$user->loggedIn($userData['id'], $userData['username']);

		//No home directory ?
		$this->_checkHomeDir('/home/'.$username);

		return $this->_userPublicAttributes($userData);
	}

	/**
	 * Logout a user.
	 */
	public function executeDisconnect() {
		$user = $this->app()->user();

		$user->loggedOut(); //Set the user as logged out
	}

	/**
	 * Edit a user's attribute.
	 * @param string $attribute The attribute name.
	 * @param string $value The new attribute's value.
	 * @param int $userId The user id. If not provided, the user will be the logged in one.
	 * @deprecated
	 */
	public function executeSetAttribute($attribute, $value, $userId = null) {
		$this->executeSetMultipleAttributes(array($attribute => $value), $userId);
	}

	/**
	 * Edit multiple user's attributes.
	 * @param array $data An array containing new attributes.
	 * @param int $userId The user id. If not provided, the user will be the logged in one.
	 */
	public function executeSetMultipleAttributes($data, $userId = null) {
		$manager = $this->managers()->getManagerOf('user');
		$authManager = $this->managers()->getManagerOf('authorization');
		$user = $this->app->user();

		$userId = $this->_autocompleteUserId($userId);
		$userData = $manager->getById($userId); //Get user data

		$editableAttrs = $this->_userEditableAttributes(); //List editable attributes

		//Control authorizations
		$userAuths = array();
		if ($user->isLogged()) {
			$userAuths = $authManager->getByUserId($user->id());
		}

		foreach($data as $attrName => $attrValue) {
			if (!in_array($attrName, $editableAttrs)) {
				$this->guardian->controlArgAuth('user.manage', $userId, $userAuths);
			} else {
				$this->guardian->controlArgAuth('user.edit', $userId, $userAuths);
			}

			if ($attrName == 'password') {
				throw new \RuntimeException('Cannot change password without providing the old one', 400);
			}

			$userData[$attrName] = $attrValue;
		}

		$manager->update($userData);
	}

	/**
	 * Edit a user's password.
	 * @param string $currentPassword The current password.
	 * @param string $newPassword The new password.
	 */
	public function executeSetPassword($currentPassword, $newPassword) {
		$manager = $this->managers()->getManagerOf('user');
		$authManager = $this->managers()->getManagerOf('authorization');
		$cryptoManager = $this->managers()->getManagerOf('crypto');
		$user = $this->app()->user();
		$userId = $user->id();

		if (!$user->isLogged()) { //User not logged in
			throw new \RuntimeException('Cannot change password of another user than you', 403);
		}

		//Control authorizations
		$userAuths = $authManager->getByUserId($userId);
		$this->guardian->controlArgAuth('user.edit', $userId, $userAuths);

		//Get user data
		$userData = $manager->getById($userId);

		//Check current password
		if (!$cryptoManager->verifyPassword($currentPassword, $userData['password'])) {
			sleep(3); //Pause script for 3s to prevent bruteforce attacks
			throw new \RuntimeException('Bad password', 403);
			return;
		}

		//Check new password
		if (empty($newPassword)) {
			throw new \InvalidArgumentException('Invalid new password (empty password)');
		}

		//Change password
		$userData['password'] = $cryptoManager->hashPassword($newPassword);
		$manager->update($userData);
	}

	/**
	 * Edit a user's authorizations.
	 * @param array  $authsList  A list of authorizations.
	 * @param int    $userId     The user id. If not provided, the user will be the logged in one.
	 */
	public function executeSetAuthorizations($authsList, $userId = null) {
		$authManager = $this->managers()->getManagerOf('authorization');
		$userId = $this->_autocompleteUserId($userId);

		//Remove old authorizations
		$currentAuths = $authManager->getByUserId($userId);
		foreach($currentAuths as $auth) {
			$authManager->deleteUserAuth($auth['id']);
		}

		//Add new ones
		foreach($authsList as $authName) {
			$auth = new UserAuthorization(array(
				'name' => $authName,
				'userId' => $userId
			));

			$authManager->insertUserAuth($auth);
		}
	}

	/**
	 * Enable or disable a user.
	 * @param string $value True to enable the user, false otherwise.
	 * @param int $userId The user id.
	 */
	public function executeSetEnabled($value, $userId) {
		$manager = $this->managers()->getManagerOf('user');

		$userData = $manager->getById($userId); //Get user data

		$userData['disabled'] = ($value) ? false : true;

		$manager->update($userData);
	}

	/**
	 * Delete a user.
	 * @param int $userId The user id.
	 */
	public function executeRemove($userId) {
		$manager = $this->managers()->getManagerOf('user');
		$authManager = $this->managers()->getManagerOf('authorization');

		$userData = $manager->getById($userId); //Get user data

		//Remove old authorizations
		$currentAuths = $authManager->getByUserId($userId);
		foreach($currentAuths as $auth) {
			$authManager->deleteUserAuth($auth['id']);
		}

		//Delete user
		$manager->delete($userId);

		//Delete home directory
		$fileManager = $this->managers()->getManagerOf('file');
		if ($fileManager->exists('/home/'.$userData['username'].'/')) {
			$fileManager->delete('/home/'.$userData['username'].'/', true); //Copy it from the default one
		}
	}

	/**
	 * Create a new user.
	 * @param string $data      The new user's data.
	 * @param array  $authsList A list of authorizations.
	 */
	public function executeCreate($data, $authsList) {
		$manager = $this->managers()->getManagerOf('user');
		$authManager = $this->managers()->getManagerOf('authorization');
		$cryptoManager = $this->managers()->getManagerOf('crypto');

		if (strlen($data['password']) < 4) {
			throw new \RuntimeException('Invalid user password (password is too short, at least 4 characters are required)');
		}

		//Hash the password
		$data['password'] = $cryptoManager->hashPassword($data['password']);

		//Create the user
		$user = new User($data);
		$manager->insert($user);

		//Store authorizations
		foreach($authsList as $authName) {
			$auth = new UserAuthorization(array(
				'name' => $authName,
				'userId' => $user['id']
			));

			$authManager->insertUserAuth($auth);
		}

		//Copy default home directory files
		$this->_checkHomeDir('/home/'.$data['username'].'/');

		return $this->_userPublicAttributes($user);
	}

	/**
	 * Register a new user.
	 * @param array $data The user's data.
	 * @param array $captchaData The captcha data.
	 */
	public function executeRegister($data, $captchaData) {
		$manager = $this->managers()->getManagerOf('user');
		$captchaManager = $this->managers()->getManagerOf('captcha');
		$configManager = $this->managers()->getManagerOf('config');

		//Check captcha
		$captcha = $captchaManager->get($captchaData['id']);
		if ($captcha['result'] != $captchaData['value']) {
			throw new \RuntimeException('Invalid captcha', 400);
		}

		//Check if registering is enabled
		$registerStatus = $this->executeCanRegister();
		if (!$registerStatus['register']) {
			throw new \RuntimeException('Registration is currently disabled', 403);
		}

		//Retrieve default authorizations for new users
		$config = $configManager->open('/etc/register.json');
		$configData = $config->read();
		$authorizations = $configData['authorizations'];

		//Create the new user
		return $this->executeCreate(array(
			'username' => $data['username'],
			'realname' => $data['realname'],
			'password' => $data['password'],
			'email' => $data['email'],
			'disabled' => (isset($configData['autoEnable']) && $configData['autoEnable']) ? false : true
		), $authorizations);
	}

	public function executeSendResetPasswordRequest($email, $webosUrl) {
		$manager = $this->managers()->getManagerOf('user');
		$tokenManager = $this->managers()->getManagerOf('userToken');
		$emailManager = $this->managers()->getManagerOf('email');
		$translationManager = $this->managers()->getManagerOf('translation');

		$resetPasswordSettings = $this->executeCanResetPassword();
		if (!$resetPasswordSettings['enabled']) {
			throw new \RuntimeException('Resetting password by e-mail is currently disabled', 403);
		}

		$user = $manager->getByEmail($email);

		if (empty($user)) {
			throw new \RuntimeException('Cannot find user with e-mail "'.$email.'"', 404);
		}

		$userToken = $tokenManager->getByUser($user['id']);

		$newTokenData = array(
			'userId' => $user['id'],
			'key' => sha1(mt_rand() . '42' . microtime()), //Generate token key
			'timestamp' => time(),
			'ip' => $_SERVER['REMOTE_ADDR']
		);

		if (!empty($userToken)) { //The user has already a token
			if ($userToken['timestamp'] + $resetPasswordSettings['delay'] > $newTokenData['timestamp']) {
				throw new \RuntimeException('Too many reset password requests were sent. Please try again later', 429);
			}

			$tokenManager->delete($userToken['id']);
		}

		//Create a new token
		$userToken = new UserToken($newTokenData);
		$tokenManager->insert($userToken);

		//Send an e-mail with token key
		$dict = $translationManager->load('webos');

		$parsedUrl = parse_url($webosUrl);
		$query = 'app=gnome-reset-password&token_id='.$userToken['id'].'&token_key='.$newTokenData['key'];
		if (!empty($parseUrl['query'])) {
			$parsedUrl['query'] .= '&'.$query;
		} else {
			$parsedUrl['query'] = $query;
		}
		$resetPasswordUrl = unparse_url($parsedUrl);

		$to = $user['email'];
		$subject = $dict->get('${webos} password reset confirmation', array('webos' => 'Symbiose'));
		$message = '<html><head><title>'.$subject.'</title></head><body>'.
			'<p>'.$dict->get('Hi ${realname},', array('realname' => $user['realname'])).'</p>'.
			'<p>'.$dict->get('You have recently let us know that you need to reset your password.  Please follow this link: ${link}', array('link' => '<a href="'.$resetPasswordUrl.'">'.$resetPasswordUrl.'</a>')).'<br />'.
			$dict->get('(If clicking the link did not work, try copying and pasting it into your browser.)').'</p>'.
			'<p>'.$dict->get('Alternatively, you can enter the following key:').'<br />'.
			$newTokenData['key'].'</p>'.
			'<p>'.$dict->get('If you did not request to reset your password, please disregard this message.').'</p>'.
			'<p>'.$dict->get('Thanks,').'<br />'.
			$dict->get('The ${webos} team', array('webos' => 'Symbiose')).'</p></body></html>';

		$headers = 'MIME-Version: 1.0' . "\r\n";
		$headers .= 'Content-type: text/html; charset=utf-8' . "\r\n";
		$headers .= 'To: '.$to . "\r\n";
		$headers .= 'From: '.$resetPasswordSettings['emailFrom'] . "\r\n";

		$email = new Email(array(
			'to' => $user['email'],
			'subject' => $subject,
			'message' => $message,
			'headers' => $headers
		));

		try {
			$emailManager->send($email);
		} catch (\Exception $e) { //Mail not sent
			$tokenManager->delete($userToken['id']);
			throw $e;
		}
	}

	public function executeGetTokenByEmail($email) {
		$manager = $this->managers()->getManagerOf('user');
		$tokenManager = $this->managers()->getManagerOf('userToken');

		//Get user
		$user = $manager->getByEmail($email);

		if (empty($user)) {
			throw new \RuntimeException('Cannot find user with e-mail "'.$email.'"', 404);
		}

		//Get token
		$userToken = $tokenManager->getByUser($user['id']);

		if (empty($userToken)) {
			throw new \RuntimeException('Cannot find token with user id "'.$user['id'].'"', 404);
		}

		return array('id' => $userToken['id']);
	}

	public function executeResetPassword($tokenId, $key, $newPassword) {
		$manager = $this->managers()->getManagerOf('user');
		$tokenManager = $this->managers()->getManagerOf('userToken');
		$cryptoManager = $this->managers()->getManagerOf('crypto');

		//Get token
		$userToken = $tokenManager->getById($tokenId);

		if (empty($userToken)) {
			throw new \RuntimeException('This token may have expired : cannot find token with id "'.$tokenId.'"', 404);
		}

		//Check token key
		if ($userToken['key'] !== $key) {
			sleep(3); //Pause script for 3s to prevent bruteforce attacks
			throw new \RuntimeException('Invalid token key "'.$key.'"', 403);
			return;
		}

		//Get user
		$user = $manager->getById($userToken['userId']);

		if (empty($user)) {
			throw new \RuntimeException('Cannot find user with id "'.$userToken['userId'].'"', 404);
		}

		//Change password
		$user['password'] = $cryptoManager->hashPassword($newPassword);
		$manager->update($user);

		//Delete token
		$tokenManager->delete($userToken['id']);
	}
}