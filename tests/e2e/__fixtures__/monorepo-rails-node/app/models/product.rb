class Product < ApplicationRecord
  has_many_attached :images
  validates :name, presence: true
end
