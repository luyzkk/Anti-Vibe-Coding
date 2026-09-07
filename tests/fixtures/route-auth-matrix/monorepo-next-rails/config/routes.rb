Rails.application.routes.draw do
  resources :invoices, only: [:index]
  get "status", to: "status#show"
end
