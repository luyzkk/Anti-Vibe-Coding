class User < ApplicationRecord
  has_many :posts
  validates :email, presence: true
end
