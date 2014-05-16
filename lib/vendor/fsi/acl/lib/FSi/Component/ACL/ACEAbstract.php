<?php

namespace FSi\Component\ACL;

abstract class ACEAbstract implements ACEInterface
{
    protected $_role;

    protected $_resource;

    protected $_permissions = array();

    protected $_options;

    public function __construct(RoleInterface $role = null, ResourceInterface $resource = null, $permissions = null)
    {
        if (isset($role))
            $this->setRole($role);
        if (isset($resource))
            $this->setResource($resource);
        if (isset($permissions) && !empty($permissions))
            $this->setPermissions($permissions);
    }

    public function setRole(RoleInterface $role)
    {
        $this->_role = $role;
        return $this;
    }

    public function setResource(ResourceInterface $resource)
    {
        $this->_resource = $resource;
        return $this;
    }

    public function setPermissions($permissions)
    {
        if (!is_array($permissions))
            $permissions = array($permissions);
        foreach ($permissions as $permission) {
            if ($permission instanceof PermissionInterface)
                $this->_permissions[] = $permission;
            else
                throw new ACLException('Specified permission object does not implement PermissionInterface');
        }
        return $this;
    }

    public function setOptions(array $options = array())
    {
        $this->_options = $options;
    }

    public function getRole()
    {
        return $this->_role;
    }

    public function getResource()
    {
        return $this->_resource;
    }

    public function getPermissions()
    {
        return $this->_permissions;
    }

    public function getOptions()
    {
        return $this->_options;
    }

    public function __toString()
    {
        return get_class($this);
    }
}
