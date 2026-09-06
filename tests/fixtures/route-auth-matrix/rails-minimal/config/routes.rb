# 2026-09-06 (Luiz/dev): fixture CA-08 Rails — subset da DSL: root sem controller, verbo com to:, resources com only, namespace, match sem via.
Rails.application.routes.draw do
  root to: "home#index"
  get "health", to: "health#show"
  resources :posts, only: [:index, :show]
  namespace :admin do
    resources :users
  end
  match "legacy", to: "legacy#handle"
end
